import { asyncHandler } from "../utils/asyncHandler.js";

const loginUser = asyncHandler(async (req, res) => {
res.status(200).json({
    message: "User login successfully",
    data: req.body
});
})

export { loginUser }