import { ObjectId } from "bson";

export default interface Sources {
    name: String;
    url: String;
    colorOne: String;
    colorTwo: String;
    _id: ObjectId;
}