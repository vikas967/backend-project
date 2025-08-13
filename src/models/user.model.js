import mongoose ,{ Schema } from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';


const userSchema = new Schema({
    username: {
        type: String,  
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        index: true 
    },
    email: {
        type: String,  
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    fullname: {
        type: String,  
        required: true,
        trim: true
    },
    avatar: {
        type: String,  // cloudinary image URL
        required: true
    },
    coverImage:{
        type: String,  // cloudinary image URL
    },
    watchHistory: [{
        type: Schema.Types.ObjectId,
        ref: 'Video'
    }], 
    password:{
        type: String,
        required: [true, 'Password is required']
    },
    refreshToken: {
        type: String
    },  


},{
    timestamps: true,
})

userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
})

userSchema.methods.isPasswordCorrect = async function(password) {
    return await bcrypt.compare(password, this.password);      // this will check the password from    user.controller.js 
}

userSchema.methods.generateAccessToken = function() {
   return  jwt.sign({
        id: this._id,
        username: this.username,
        email: this.email,
        fullname: this.fullname 

    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRES || '1d'
    })
}

userSchema.methods.generateRefreshToken = function() {
    return jwt.sign({
        id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES || '30d'
    })
}


export const User = mongoose.model("User", userSchema);