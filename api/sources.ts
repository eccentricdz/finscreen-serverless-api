import { VercelRequest, VercelResponse } from "@vercel/node";
import { MongoClient } from "mongodb";
import SourcesDAO from "./dao/SourcesDao";
import Sources from "./types/Source";

async function establishDbConnection() {
    await MongoClient.connect(process.env.FINSCREEN_DB_URI, { useNewUrlParser: true })
        .catch((err) => {
            console.error(err.stack);
            process.exit(1);
        })
        .then(async (client) => {
            await SourcesDAO.injectDB(client);
        });
}

export default (request: VercelRequest, response: VercelResponse) => {
    establishDbConnection()
        .then(() => {
            SourcesDAO.getSources().then((sources) =>
                response.status(200).json(sources)
            );
        })
        .catch((error) => {
            console.error(
                `Unable to fetch the sources from the SourceDAO : ${error}`
            );
        });
};
