/* global element, by */
const chai = require('chai');
const helpers = require('../shared/helpers');

helpers.configure(chai);
const { expect } = chai;

const components = require('../shared/components');
const FU = require('../shared/FormUtils');

describe('Debtor Groups Management', () => {
  const INITIAL_GROUPS = 3;
  const DELETEABLE_DEBTOR_GROUP = 'a11e6b7f-fbbb-432e-ac2a-5312a66dccf4';

  const root = '#/debtors/groups';
  before(() => helpers.navigate(root));

  // helper to quickly get a group by uuid
  const getGroupRow = (uuid) => $(`[data-group-entry="${uuid}"]`);

  it('lists base test debtor groups', () => {
    expect(element.all(by.css('[data-group-entry]')).count()).to.eventually.equal(INITIAL_GROUPS);
  });

  it('creates a debtor group', () => {
    FU.buttons.create();

    FU.input('GroupUpdateCtrl.group.name', 'E2E Debtor Group');

    FU.uiSelect('GroupUpdateCtrl.group.color', 'Jaune');

    components.accountSelect.set('41111010'); // CHURCH
    FU.input('GroupUpdateCtrl.group.max_credit', '1200');
    FU.input('GroupUpdateCtrl.group.note', 'This debtor group was created by an automated end to end test.');
    FU.input('GroupUpdateCtrl.group.phone', '+243 834 443');
    FU.input('GroupUpdateCtrl.group.email', 'e2e@email.com');

    FU.select('GroupUpdateCtrl.group.price_list_uuid', 'Test Price List');

    FU.buttons.submit();

    components.notification.hasSuccess();

    expect(element.all(by.css('[data-group-entry]')).count()).to.eventually.equal(INITIAL_GROUPS + 1);
  });

  it('deletes a debtor group', () => {
    // find the group by uuid
    const group = getGroupRow(DELETEABLE_DEBTOR_GROUP);

    // delete the creditor group
    group.$('[data-method="update"]').click();

    // click the "delete" button
    FU.buttons.delete();

    // submit the confirmation modal
    FU.modal.submit();

    components.notification.hasSuccess();
  });


  it('updates a debtor group', () => {
    const updateGroup = element.all(by.css('[data-group-entry]'));
    updateGroup.all(by.css('[data-method="update"]')).first().click();

    FU.input('GroupUpdateCtrl.group.max_credit', '500');
    FU.input('GroupUpdateCtrl.group.name', '[Updated]');

    FU.buttons.submit();

    components.notification.hasSuccess();
  });

  it('updates debtor group invoicing fee subscriptions', () => {
    const updateGroup = element.all(by.css('[data-group-entry]')).first();

    updateGroup.$('[data-method="update"]').click();

    element(by.css('#invoicingFeeSubscription')).click();
    element.all(by.css('[data-group-option]')).get(1).click();
    FU.modal.submit();
    components.notification.hasSuccess();
  });

  it('updates debtor group subsidy subscriptions', () => {
    element(by.css('#subsidySubscription')).click();
    element.all(by.css('[data-group-option]')).get(1).click();
    FU.modal.submit();
    components.notification.hasSuccess();
  });
});
