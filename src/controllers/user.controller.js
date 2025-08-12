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

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordValid = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordValid) {
        throw new ApiError(401, "Old password is incorrect");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false })

    return res.status(200).json(
        new ApiResponse(200, "Password changed successfully")
    )
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(    
        new ApiResponse(200,
            "Current user fetched successfully", req.user)
    )
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullname, username, email } = req.body;
    if (!fullname || !username || !email) {
        throw new ApiError(400, "All fields are required");
    }
    
    const user = User.findByIdAndUpdate(
        req?.user._id,
        {
            $set: {
                fullname,
                username: username.toLowerCase(),
                email: email.toLowerCase()
            }
        },
        { new: true, runValidators: true }

    ).select("-password -refreshToken");

    return res.status(200).json(
        new ApiResponse(200, "Account details updated successfully", user)
    )
        
}
);

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar image is required");
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if (!avatar.url) {
        throw new ApiError(500, "Failed to upload avatar image");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { avatar: avatar.url } },
        { new: true, runValidators: true }
    ).select("-password -refreshToken");

    return res.status(200).json(
        new ApiResponse(200, "Avatar updated successfully", user)      
    )
})

const updateUserCoverimage = asyncHandler(async (req, res) => {
    const CoverLocalPath = req.file?.path
    if (CoverLocalPath) {
        throw new ApiError(400, "Cover image is required");
    }
    const  coverImage = await uploadOnCloudinary(CoverLocalPath)
    if (! coverImage.url) {
        throw new ApiError(500, "Failed to upload Cover image");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: {  coverImage:  coverImage.url } },
        { new: true, runValidators: true }
    ).select("-password -refreshToken");

    return res.status(200).json(
        new ApiResponse(200, "Cover image updated successfully", user)      
    )
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
     const { username } = req.params
    if (!username?.trim()) {
        throw new ApiError(400, "Username is required");
    }

    const channel = await User.aggregate([
        {
            $match: { username: username.toLowerCase() }
        },
        { 
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscriberCount: { $size: "$subscribers" },
                subscribedToCount: { $size: "$subscribedTo" },
                isSubscribed: {
                    $cond:{
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                username: 1,
                fullname: 1,
                avatar: 1,
                subscriberCount: 1,
                subscribedToCount: 1,
                isSubscribed: 1,
                coverImage: 1,
                email
            }
        }

    ])
    if (!channel.length) {
        throw new ApiError(404, "Channel not found");
    }
    return res.status(200).json(
        new ApiResponse(200, "Channel profile fetched successfully", channel[0])
    )
})

const getWatchHistory = asyncHandler(async (req, res) => {
     const user = await user.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "Video",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistoryVideos",
                pipeline: [
                {
                   $lookup:{
                        from: "users",
                        localField: "owner",
                        foreignField: "_id",
                        as: "ownerDetails",
                        pipeline: [{
                            $project: {
                                username: 1,
                                fullname: 1,
                                avatar: 1
                            }
                        }]
                        
                   } 
                },
                {
                    $addFields: {
                        owner: { $arrayElemAt: ["$ownerDetails", 0] }
                    }
                }
            ]
            }
        }
     ])
     return res.status(200).json(
        new ApiResponse(200, "Watch history fetched successfully", user[0].watchHistoryVideos)
     )
})
    

export { registerUser,loginUser, logoutUser, refreshAccessToken,changeCurrentPassword , getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverimage, getUserChannelProfile, getWatchHistory }; 