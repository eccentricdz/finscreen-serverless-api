import { VercelRequest, VercelResponse } from "@vercel/node";
import { Collection, Cursor, Db, MongoClient } from "mongodb";
import * as XMLParser from "fast-xml-parser";
import fetch from "node-fetch";
import { ObjectId } from "bson";
import * as R from "ramda";

/**
 * A model representing a source of articles.
 */
interface Source {
    name: string;
    url: string;
    colorOne: string;
    colorTwo: string;
    _id: ObjectId;
}

/**
 * A model representing an article from a source.
 */
interface Article {
    title: string;
    link: string;
    imageUrl?: string;
    author?: string;
    description?: string;
    pubDate: string;
}

let finscreenDB: Db;
let sources: Collection<Source>;

class ArticlesDAO {
    static async getArticles(source: Source): Promise<any> {
        try {
            const response = await fetch(source.url);
            if (!response.ok) {
                throw new Error(
                    `Network response was not ok: ${response.statusText}`
                );
            }

            const responseXML = await response.text();

            if (XMLParser.validate(responseXML) === true) {
                return R.compose(extractArticles, XMLParser.parse)(responseXML)
            } else {
                throw new Error(`Error when trying to parse the XML response`);
            }
        } catch (error) {
            console.error(
                "There has been a problem with your fetch operation:",
                error
            );
        }
    }
}

class SourceDAO {
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
    static async getSource(id: ObjectId): Promise<Source[]> {
        let cursor: Cursor<Source>;
        try {
            cursor = await sources.find({ _id: id });
            return cursor.limit(1).toArray();
        } catch (e) {
            console.error(`Unable to find sources in the Collection: ${e}`);
        }
    }
}

/**
 * Extracts a list of [Article] from the given Source JSON.
 */
const extractArticles = R.compose(
    R.project(["title", "link", "pubDate", "description"]),
    R.pathOr([], ["rss", "channel", "item"])
);

async function establishDbConnection() {
    await MongoClient.connect(process.env.FINSCREEN_DB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
        .catch((err) => {
            console.error(err.stack);
            process.exit(1);
        })
        .then(async (client) => {
            await SourceDAO.injectDB(client);
        });
}

/**
 * We need to create a new deployment everytime we add a new source to the DB
 * This will make sure our cache is invalidated and our users get the latest
 * set of sources.
 */
const setCacheHeaders = (response: VercelResponse): VercelResponse => {
    response.setHeader("Cache-Control", "max-age=0, s-maxage=900");
    return response;
};

/**
 * The primary entry point for the API /api/sources
 */
export default async (request: VercelRequest, response: VercelResponse) => {
    try {
        const sourceId: string = request.query.sourceId as string;
        await establishDbConnection();
        const sources = await SourceDAO.getSource(new ObjectId(sourceId));
        const articles = await ArticlesDAO.getArticles(sources[0]);
        return setCacheHeaders(response).status(200).json(articles);
    } catch (error) {
        console.error(
            `Unable to fetch the sources from the SourceDAO : ${error}`
        );
    }
};
