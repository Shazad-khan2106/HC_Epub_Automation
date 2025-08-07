import { Given, When, Then } from "@cucumber/cucumber";
import { CustomWorld } from "../../support/world";
import { HomePage } from "../pages/HomePage";
const { testData } = require('../test_data/properties');



When('I open the Creative Workspace login page', async function (this: CustomWorld) {
  this.homePage = new HomePage(this);
  await this.homePage.gotoHome();
});

Then('I should see the homepage', async function (this: CustomWorld) {
  await this.homePage.isHomepageVisible();
});
