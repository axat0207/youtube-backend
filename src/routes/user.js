import { Router } from "express";
import  {registerUser, login, logout, refreshAccessToken } from "../controllers/user.js";
import { upload } from "../middleware/multer.js";
import { verifyJwt } from "../middleware/verifyJwt.js";
const router = Router();

router.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 }, // limit to one file per field, the name of the key in req.
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);

router.route("/login").post(login);
router.route("/logout").post(verifyJwt,logout);
router.route('/refresh-token').post(refreshAccessToken);
export default router;
