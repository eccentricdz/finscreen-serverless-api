import { VercelRequest, VercelResponse } from "@vercel/node";
import { Collection, Cursor, Db, MongoClient } from "mongodb";
import { ObjectId } from "bson";

interface Source {
    name: string;
    url: string;
    colorOne: string;
    colorTwo: string;
    _id: ObjectId;
}

let finscreenDB: Db;
let sources: Collection<Source>;

class SourcesDAO {
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
            console.error(`Unable to find sources in the Collection: ${e}`);
        }
    }
}

async function establishDbConnection() {
    await MongoClient.connect(process.env.FINSCREEN_DB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
        .catch((err) => {
            console.error(
                `Unable to connect to the MongoDB client: ${err.stack}`
            );
            process.exit(1);
        })
        .then(async (client) => {
            await SourcesDAO.injectDB(client);
        });
}

/**
 * We need to create a new deployment everytime we add a new source to the DB
 * This will make sure our cache is invalidated and our users get the latest
 * set of sources.
 */
const setCacheHeaders = (response: VercelResponse): VercelResponse => {
    response.setHeader("Cache-Control", "max-age=0, s-maxage=2592000");
    return response;
};

/**
 * The primary entry point for the API /api/sources
 */
export default (request: VercelRequest, response: VercelResponse) => {
    establishDbConnection()
        .then(() => {
            SourcesDAO.getSources().then((sources) =>
                setCacheHeaders(response).status(200).json(sources)
            );
        })
        .catch((error) => {
            console.error(
                `Unable to fetch the sources from the SourceDAO : ${error}`
            );
        });
};
