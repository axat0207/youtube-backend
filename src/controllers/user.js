import { User } from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const registerUser = async (req, res) => {
  const { username, email, fullName, password } = req.body;

  try {
    if (
      [fullName, email, username, password].some(
        (field) => field?.trim() === ""
      )
    ) {
      throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existedUser) {
      return res
        .status(409)
        .json({ message: "Username or Email already exists." });
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    let coverImageLocalPath;
    if (
      req.files &&
      Array.isArray(req.files.coverImage) &&
      req.files.coverImage.length > 0
    ) {
      coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
      return res.status(400).json({ message: "Avatar is required." });
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
      return res.status(400).json({ message: "Avatar is required." });
    }

    const user = await User.create({
      username: username.toLowerCase(),
      email,
      fullName,
      avatar: avatar.url,
      coverImage: coverImage?.url || "",
      password,
    });

    const createUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    if (!createUser) {
      return res.status(500).json({ message: "Something Went wrong." });
    }

    return res.status(201).json(createUser);
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" + error });
  }
};

const login = async (req, res) => {
  const { email, username, password } = req.body;

  try {
    if (!email && !username) {
      return res.status(400).json({ message: "Email or Username are required" });
    }

    const user = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (!user) {
      return res.status(401).json({ message: "User does not exist!" });
    }

    const validPassword = await bcrypt.compare(String(password), user.password);

    if (!validPassword) {
      return res.status(401).json({ message: "Invalid Password!" });
    }

    const accessToken = jwt.sign({ _id: user._id }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    });
    const refreshToken = jwt.sign({ _id: user._id }, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    });

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
      httpOnly: true,
      secure: true,
    };

    res.cookie("accessToken", accessToken, options);
    res.cookie("refreshToken", refreshToken, options);

    return res.status(200).json({ message: "User logged In Successfully", loggedInUser, accessToken, refreshToken });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" + error });
  }
};




export { registerUser, login };
