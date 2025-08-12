import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js"; // Assuming you have a User model defined
import { uploadOnCloudinary } from "../utils/cloudnary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from 'jsonwebtoken';

const generateAccessTokenAndRefreshToken = async(userId)=>{
    try{
       const user = await User.findById(userId);
       const accessToken = user.generateAccessToken()
       const refreshToken = user.generateRefreshToken()

       user.refreshToken = refreshToken;
       await user.save({ validateBeforeSave: false })

       return { accessToken, refreshToken }
    }catch(error){
        throw new ApiError(500, "Failed to generate tokens");
    }
}

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for image , check for avatar
    // upload them to cloudinary
    // create user object -- create entry in db
    // remove password and refresh token feild from response
    // check for user creation
    // return response

    const { username, email, fullname, avatar, coverImage, password } = req.body;
    // console.log("email", email);

    if (!username || !email || !fullname || !password) {
        throw new ApiError(400, "All fields are required");
    }
     
    const existedUser = await User.findOne({ $or: [{ username }, { email }] })

    if(existedUser) {
        throw new ApiError(400, "User already exists with this username or email");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    // console.log(req.body);

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar image is required");
    }
    const Avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverimage = await uploadOnCloudinary(coverImageLocalPath)

    if(!Avatar){
        throw new ApiError(500, "Failed to upload avatar image");
    }

    const user = await User.create({
        fullname,
        avatar: Avatar.secure_url,
        coverImage: coverimage?.secure_url || "",
        email,
        password,
        username : username.toLowerCase()
    })
    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser) {
        throw new ApiError(500, "Failed to create user");
    }

    return res.status(201).json(
        new ApiResponse(200, "User registered successfully", createdUser)
    );

})

const loginUser = asyncHandler(async (req, res) => {
    // req->body -> data
    // username or email
    // find the user
    // check password
    // if password matches, generate access token and refresh token
    // send cookies with tokens
    // return response with user data
    const { email,password, username } = req.body;

    if(!(email || username)){
        throw new ApiError(400, "Email and username are required");
    }

   const user = await User.findOne({ $or: [{ email }, { username }] })
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const isPasswordvalid = await user.isPasswordCorrect(password);

    if (!isPasswordvalid) {
        throw new ApiError(401, "Invalid password");
    }

    const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user._id);

     const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

     const optionas = {
        httpOnly: true,
        secure:true
     }

     return res
     .status(200)
        .cookie("accessToken", accessToken, optionas)
        .cookie("refreshToken", refreshToken, optionas)
        .json(
            new ApiResponse(
                200,
                {
                    user : loggedInUser,accessToken, refreshToken
                },
                "User logged in successfully"
            )
        )
     
})

const logoutUser = asyncHandler(async (req, res) => {
   await  User.findByIdAndUpdate(
        req.user._id, 
        { 
         $set:{
            refreshToken: undefined
         }

        },{
            new: true,
        }
    )
     const optionas = {
        httpOnly: true,
        secure:true
     }

     return res
        .status(200)
        .clearCookie("accessToken", optionas)
        .clearCookie("refreshToken", optionas)
        .json(
            new ApiResponse(200, "User logged out successfully")
        )
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Refresh token is required");
    }

  try{
     const decodedToken= jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET,
    )

    const user = await User.findById(decodedToken.id)
    if (!user || user?.refreshToken !== incomingRefreshToken) {
        throw new ApiError(401, "Invalid or expired refresh token");
    }

    const options = {
        httpOnly: true,
        secure: true
    }

   const {accessToken,newrefreshToken} = await generateAccessTokenAndRefreshToken(user._id)

   return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken",newrefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken,
                    refreshToken: newrefreshToken
                },
                "Access token refreshed successfully"
            )
        )
    } catch (error) {
        throw new ApiError(401, "Invalid or expired refresh token", [], error.stack);
    }
})

export { registerUser,loginUser, logoutUser, refreshAccessToken }