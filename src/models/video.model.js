import mongoose, {Schema} from 'mongoose';
import { User } from './User.model';
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';
const videoSchema = new Schema({

    title : {
        type : String,
        required: true,
        index : true
    },
    description : {
        type : String,
        required: true,
    },
    videoFile : {
        type : String,
        required: true,
    },
    thumbnail : {
        type : String,
        required: true,
    },
    duration: {
        type : Number,
        required : true
    },
    views : {
        type : Number,
        default : 0
    },
    isPublished : {
        type : Boolean,
        default : true
    },
    owner : {
        type : Schema.Types.ObjectId,
        ref : "User"
    }

},{
    timestamps : true,
})

export const Video = mongoose.model('Video',videoSchema)

videoSchema.plugin(mongooseAggregatePaginate);