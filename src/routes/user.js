import { Router } from "express";
import  {registerUser, login } from "../controllers/user.js";
import { upload } from "../middleware/multer.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 }, // limit to one file per field, the name of the key in req.
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);

router.route("/login").post(login);

export default router;
