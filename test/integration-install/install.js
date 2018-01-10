/* global expect, chai */

const helpers = require('../integration/helpers');

describe('(/install) The installation API', () => {
  const port = process.env.PORT || 8080;
  const url = `http://localhost:${port}`;

  // settings
  const CURRENCY_ID = 2;
  const ENTERPRISE_ID = 1;
  const PROJECT_ID = 1;

  const enterprise = {
    id : ENTERPRISE_ID,
    name : 'IMA WorldHealth',
    abbr : 'IMA',
    currency_id : CURRENCY_ID,
  };

  const project = {
    id : PROJECT_ID,
    name : 'ASSP',
    abbr : 'ASP',
    enterprise_id : ENTERPRISE_ID,
  };

  const user = {
    username : 'root',
    password : 'toor',
    name : 'Root',
  };

  it(`check previous installation doesn't exist`, () => {
    return chai.request(url)
      .get('/install')
      .then((res) => {
        expect(res).to.have.status(200);
        expect(res.body.isInstalled).to.equal(false);
      })
      .catch(helpers.handler);
  });

  it('set a new installation', () => {
    const params = { enterprise, project, user };
    return chai.request(url)
      .post('/install')
      .send(params)
      .then((res) => {
        // successful redirected to /
        expect(res).to.have.status(200);
      })
      .catch(helpers.handler);
  });

});
