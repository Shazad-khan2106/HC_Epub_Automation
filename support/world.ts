import { setWorldConstructor, World } from '@cucumber/cucumber';
import { Browser, Page, BrowserContext } from 'playwright';
import { HomePage } from '../tests/pages/HomePage';
import { Expect } from 'playwright/test';


export class CustomWorld extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  homePage!: HomePage;
  logs: string[] = [];
  expect!: Expect;

  addLog(message: string) {
    const timestamp = new Date().toISOString();
    this.logs.push(`[${timestamp}] ${message}`);
  }
}

setWorldConstructor(CustomWorld);
