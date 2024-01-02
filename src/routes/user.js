import { Router } from "express";
import {
  registerUser,
  login,
  logout,
  refreshAccessToken,
  changeCurrentPassword,
  getUser,
  updateUser,
  updateAvtar,
} from "../controllers/user.js";
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
router.route("/logout").post(verifyJwt, logout);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJwt, changeCurrentPassword);
router.route("/get-user").get(verifyJwt, getUser);
router.route("/update-user").post(verifyJwt, updateUser);
router
  .route("/change-avatar")
  .post(verifyJwt, upload.single({ name: "avatar", maxCount: 1 }), updateAvtar);
export default router;
