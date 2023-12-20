import dotenv from 'dotenv'
import {app} from './app.js'
import connectDB from './db/index.js'
dotenv.config({
    path : './.env'
})
connectDB()