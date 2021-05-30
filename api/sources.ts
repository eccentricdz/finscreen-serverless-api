import { VercelRequest, VercelResponse } from "@vercel/node";
import { Collection, Cursor, Db, MongoClient } from "mongodb";
import { ObjectId } from "bson";

interface Source {
    name: String;
    url: String;
    colorOne: String;
    colorTwo: String;
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
    })
        .catch((err) => {
            console.error(err.stack);
            process.exit(1);
        })
        .then(async (client) => {
            await SourcesDAO.injectDB(client);
        });
}

const setCacheHeaders = (response: VercelResponse): VercelResponse => {
    response.setHeader("Cache-Control", "s-maxage=2592000");
    return response;
};

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
