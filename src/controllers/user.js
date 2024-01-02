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
  const hasedPassword = await bcrypt.hash(password, 10);
  try {
    if (
      [fullName, email, username, password].some(
        (field) => field?.trim() === ""
      )
    ) {
      res.status(400).json({ message: "All fields are Required" });
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
      password: hasedPassword,
    });

    const createUser = await User.findById(user._id).select(" -refreshToken");

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
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" + error });
  }
};

const login = async (req, res) => {
  const { email, username, password } = req.body;

  if (!email || !username) {
    res.status(400).json({ message: "Email is required" });
  }

  if (!password) {
    res.status(400).json({ message: "password is required" });
  }
  try {
    const user = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (!user) {
      return res.status(401).json({ message: "User does not exist!" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: "Invalid Password" });
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

    const loggedInUser = await User.findById(user._id).select(" -refreshToken");

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
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Internal Srver Error" });
  }
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

const changeCurrentPassword = async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword) {
    return res
      .status(400)
      .json({ message: "Please provide a valid password." });
  }
  const hashNewPassword = await bcrypt.hash(newPassword, 10);
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          password: hashNewPassword,
        },
      },
      {
        new: true,
      }
    );
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    const checkUpdatedPassword = await User.findById(req.user?._id);
    console.log(checkUpdatedPassword);
    res.status(200).json({ message: "Password change sucessfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Internal Server Error" + error.message });
  }
};

const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.user?._id).select(
      "-password -refreshToken"
    );
    if (!user) {
      res.status(400).json({ message: "User Not found" });
    }
    res.status(200).json({ user });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const updateUser = async (req, res) => {
  const { fullName, email } = req.body;
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          email,
          fullName,
        },
      },
      {
        new: true,
      }
    );
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }
    res.status(200).json({ user });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Internal Server Error " });
  }
};

const updateAvtar = async (req, res) => {
  const newLocalAvatar = req.file?.path;
  if (!newLocalAvatar) {
    return res.status(400).json("Please upload a valid image");
  }
  try {
    const newCloudAvatar = await uploadOnCloudinary(newLocalAvatar);
    //delete old avatar from cloudinary and local system
    if (!newCloudAvatar.url) {
      return res.status(400).json("Error on upload of avatar");
    }

    await findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          avatar: newCloudAvatar.url,
        },
      },
      {
        new: true,
      }
    );
    res.status(201).json({
      message: "Avatar Updated Sucessfully",
      avatar: newCloudAvatar.url,
    });
  } catch (error) {
    console.error(error.message);
    // If there's an error we want to
    // send a 500 Internal Server Error status response
    // And also include the error in the JSON body.
    res.status(500).send({ error: /Error updating avatar/ });
  }
};

export {
  registerUser,
  login,
  logout,
  refreshAccessToken,
  changeCurrentPassword,
  getUser,
  updateUser,
  updateAvtar,
};
