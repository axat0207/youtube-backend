import { User } from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";

const registerInput = z.object({
  fullName: z.string().min(3), //name is a string and should be at least 3 characters long
  email: z.string().email(), //email is a valid email address
  username: z.string().min(2).max(20),
  password: z.string().min(3).max(20),
});

// type registerParse = z.infer<typeof registerInput>;
const registerUser = async (req, res) => {
  const parsedResponse = registerInput.safeParse(req.body);
  if (!parsedResponse.success) {
    return res.status(400).send(parsedResponse.error);
  }
  // const { username, email, fullName, password } = req.body;

  const username = parsedResponse.data.username;
  const email = parsedResponse.data.email;
  const fullName = parsedResponse.data.fullName;
  const password = parsedResponse.data.password;

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
    const options = {
      httpOnly: true,
      secure: true,
    };
    if (req.cookies.accessToken) {
      res.clearCookie("accessToken", options);
      res.clearCookie("refreshToken", options);
    }
    return res.status(201).json(createUser);
    console.log("Created user sucessfully");
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" + error });
  }
};

const login = async (req, res) => {
  const { email, username, password } = req.body;

  // try {
  if (!email || !password || username) {
    return res
      .status(400)
      .json({ message: "Email or Username and Password is required" });
  }

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) {
    return res.status(401).json({ message: "User does not exist!" });
  }

  // const validPassword = await bcrypt.compare(password, user.password);

  if (password != user.password) {
    return res.status(401).json({ message: "Invalid Password!" });
  }

  const accessToken = jwt.sign(
    { _id: user._id },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
  const refreshToken = jwt.sign(
    { _id: user._id },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  res.cookie("accessToken", accessToken, options);
  res.cookie("refreshToken", refreshToken, options);

  return res.status(200).json({
    message: "User logged In Successfully",
    loggedInUser,
    accessToken,
    refreshToken,
  });
};

const logout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          refreshToken: undefined,
        },
      },
      {
        new: true,
      }
    );

    const options = {
      httpOnly: true,
      secure: true,
    };
    res.clearCookie("accessToken", options);
    res.clearCookie("refreshToken", options);
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error " + error });
  }
};

const refreshAccessToken = async (req, res) => {
  const incomingRefreshToken = res.cookie.refreshToken;
  if (!incomingRefreshToken) {
    res.status(401).json({ message: "Unathorized Access" });
  }
 try {
   const decodedToken = jwt.verify(
     incomingRefreshToken,
     proces.env.REFRESH_TOKEN_SECRET
   );
   if (!decodedToken) {
     res.status(401).json({ message: "Invalid Token" });
   }
   const user = await User.findById(decodedToken?._id);
 
   const newAccessToken = jwt.sign(
     { _id: user._id },
     process.env.ACCESS_TOKEN_SECRET,
     {
       expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
     }
   );
   const newRefreshToken = jwt.sign(
     { _id: user._id },
     process.env.REFRESH_TOKEN_SECRET,
     {
       expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
     }
   );
 
   const options = {
     httpOnly: true,
     secure: true,
   };
 
   res
     .status(200)
     .cookie("accessToken", newAccessToken, options)
     .cookie("refreshToken", newRefreshToken, options)
     .json({
       message: "New Access token generated",
       accessToken: newAccessToken,
       refreshToken: newRefreshToken,
     });
 } catch (error) {
  console.log(error);
  res.status(500).json({ message: "Server Error" + error?.message });
    
 }
};

export { registerUser, login, logout, refreshAccessToken };
