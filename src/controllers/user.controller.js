import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js"; // Assuming you have a User model defined
import { uploadOnCloudinary } from "../utils/cloudnary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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

export { registerUser }