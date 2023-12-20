import fs from "fs";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  if (!localUrl) return null;
  try {
    const respone = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    //file has been uploded sucessfully
    console.log(respone.url);
    return respone;
  } catch (error) {
    fs.unlink(localFilePath); //remove the locally saved temp file as upload failed
    return null;
  }
};


export default uploadOnCloudinary;
