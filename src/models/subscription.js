import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema({
    subscriber : {
        type : Schema.Types.ObjectId,
        ref : "User",
    },
    channel : {
        type : Schema.Types.ObjectId,
        ref : "User",
    }

},{
    timestamps: true  //creates createdAt and updatedAt fields
});
export const subscription = mongoose.model('Subcription',subscriptionSchema);

