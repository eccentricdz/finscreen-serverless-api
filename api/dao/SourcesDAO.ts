import { Collection, Cursor, Db, MongoClient } from "mongodb";
import Source from "../types/Source";

let finscreenDB: Db;
let sources: Collection<Source>;

export default class SourcesDAO {
    static async injectDB(client: MongoClient) {
        try {
            finscreenDB = await client.db(process.env.FINSREEN_DB_NS);
            sources = await finscreenDB.collection("sources");
        } catch (e) {
            console.error(
                `Unable to establish a collection handle in sourcesDAO: ${e}`
            );
        }
    }

    /**
     * Get all the sources in the collection
     * @returns Promise<Source[]>
     */
    static async getSources(): Promise<Source[]> {
        let cursor: Cursor<Source>;
        try {
            cursor = await sources.find();
            return cursor.toArray();
        } catch (e) {
            console.error(
                `Unable to find sources in the Collection: ${e}`
            )
        }
    }
}
