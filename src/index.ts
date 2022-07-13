import express from "express";
import { Application, Request, Response, NextFunction } from 'express';
import * as http from 'http';
import config from './config';
import { Cluster } from 'puppeteer-cluster';
const puppeteerConfig = require('../puppeteer.config.json');

class Server {
  private server: http.Server | undefined;
  private app: Application;
  cluster?: Cluster;
  mempoolHost: string;

  constructor() {
    this.app = express();
    this.mempoolHost = config.MEMPOOL.HTTP_HOST + (config.MEMPOOL.HTTP_PORT ? ':' + config.MEMPOOL.HTTP_PORT : '');
    this.startServer();
  }

  async startServer() {
    this.app
      .use((req: Request, res: Response, next: NextFunction) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        next();
      })
      .use(express.urlencoded({ extended: true }))
      .use(express.text())
      ;

    this.cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_CONTEXT,
        maxConcurrency: config.PUPPETEER.CLUSTER_SIZE,
        puppeteerOptions: puppeteerConfig,
    });
    await this.cluster?.task(async (args) => { return this.renderPreviewTask(args) });

    this.setUpRoutes();

    this.server = http.createServer(this.app);

    this.server.listen(config.SERVER.HTTP_PORT, () => {
      console.log(`Mempool Unfurl Server is running on port ${config.SERVER.HTTP_PORT}`);
    });
  }

  setUpRoutes() {
    this.app.get('/render*', async (req, res) => { return this.renderPreview(req, res) })
    this.app.get('*', (req, res) => { return this.renderHTML(req, res) })
  }


  async renderPreviewTask({ page, data: url }) {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.evaluate(async () => {
     const imgSelectors = Array.from(document.querySelectorAll("img"));
     await Promise.all([
       document.fonts.ready,
       ...imgSelectors.map((img) => {
         // Image has already finished loading, let’s see if it worked
         if (img.complete) {
           // Image loaded and has presence
           if (img.naturalHeight !== 0) return;
           // Image failed, so it has no height
           throw new Error("Image failed to load");
         }
         // Image hasn’t loaded yet, added an event listener to know when it does
         return new Promise((resolve, reject) => {
           img.addEventListener("load", resolve);
           img.addEventListener("error", reject);
         });
       }),
     ]);
   });
    return page.screenshot();
  }

  async renderPreview(req, res) {
    try {
      const img = await this.cluster?.execute(this.mempoolHost + req.params[0]);

      res.contentType('image/png');
      res.send(img);
    } catch (e) {
      console.log(e);
      res.status(500).send(e instanceof Error ? e.message : e);
    }
  }

  renderHTML(req, res) {
    const ogImageUrl = config.SERVER.HOST + '/render' + req.originalUrl;
    res.send(`
      <!doctype html>
      <html lang="en-US" dir="ltr">
      <head>
        <meta charset="utf-8">
        <title>mempool - Bitcoin Explorer</title>

        <meta name="description" content="The Mempool Open Source Project™ - our self-hosted explorer for the Bitcoin community."/>
        <meta property="og:image" content="${ogImageUrl}"/>
        <meta property="og:image:type" content="image/png"/>
        <meta property="og:image:width" content="1024"/>
        <meta property="og:image:height" content="512"/>
        <meta property="twitter:card" content="summary_large_image">
        <meta property="twitter:site" content="@mempool">
        <meta property="twitter:creator" content="@mempool">
        <meta property="twitter:title" content="The Mempool Open Source Project™">
        <meta property="twitter:description" content="Our self-hosted mempool explorer for the Bitcoin community."/>
        <meta property="twitter:image:src" content="${ogImageUrl}"/>
        <meta property="twitter:domain" content="mempool.space">

      <body></body>
      </html>
    `);
  }
}

const server = new Server();
