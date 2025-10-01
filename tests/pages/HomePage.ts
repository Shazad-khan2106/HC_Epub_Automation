import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config();
const { testData } = require('../test_data/properties');
import { CustomWorld } from '../../support/world'; 
import { locators } from '../locator/locators';


export class HomePage {
  constructor(private world: CustomWorld) {}

  private get page() {
    return this.world.page;
  }
  async gotoHome() {
    this.world.addLog('Navigating to Creative Workspace login page');
    await this.page.goto(testData.URL, {timeout: 1200000});
  }
  async isHomepageVisible() {
    const visible = await this.page.getByText('Welcome to the BookGenie Mode').isVisible({timeout: 300000});
    this.world.addLog(`Homepage visibility: ${visible}`);
    return visible;
  }
}
