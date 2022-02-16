import { VercelRequest, VercelResponse } from "@vercel/node";
import * as XMLParser from "fast-xml-parser";
import fetch from "node-fetch";
import * as R from "ramda";

/**
 * A model representing an article from a source.
 */
interface Article {
    title: string;
    link: string;
    image?: string;
    description: string;
    pubDate: string;
    category: string | string[];
}

class ArticlesDAO {
    static async getArticles(feedUrl?: string): Promise<Article[]> {
        try {
            if (!feedUrl)
                throw new Error("No feedUrl present in the request body.");
            const response = await fetch(feedUrl);
            if (!response.ok) {
                throw new Error(
                    `Network response was not ok: ${response.statusText}`
                );
            }

            const responseXML = await response.text();

            if (XMLParser.validate(responseXML) === true) {
                return R.compose(extractArticles, XMLParser.parse)(responseXML);
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

/**
 * Extracts a list of [Article] from the given Source JSON.
 */
const extractArticles: (arg0: any) => Article[] = R.compose(
    R.project(["title", "link", "pubDate", "description", "category", "image"]),
    R.pathOr([], ["rss", "channel", "item"])
);

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
        console.log(request.body);
        const feedUrl = request.body?.feedUrl || undefined;
        const articles = await ArticlesDAO.getArticles(feedUrl);
        return setCacheHeaders(response).status(200).json(articles);
    } catch (error) {
        console.error(
            `Unable to fetch the articles from the ArticlesDAO : ${error}`
        );
    }
};
