import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
const app = express();
const port = process.env.PORT || 8888;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credential: true,
  })
);

app.use(cookieParser());

app.use(express.json({ limit: "16kb" }));

app.use(express.urlencoded({ extended: true, limit: "16kb" }));

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.send("Server Is working Fine");
});

//Routes
import userRouter from "./routes/user.js";
app.use('/api/v1/user',userRouter)



app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});


export {app};