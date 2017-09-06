const express = require('express');
const handlebars  = require('express-handlebars');

const app = express();
app.engine('handlebars', handlebars({
  defaultLayout: 'main',
  helpers: {
    debug: () => JSON.stringify(arguments, null, 2)
  }
}));
app.set('view engine', 'handlebars');

module.exports = (robot) => {
  app.get('/:installation/:owner/:repo/pull/:number', async (req, res) => {
    const {owner, repo, number} = req.params;

    const github = await robot.auth(req.params.installation);
    const pr = await github.pullRequests.get({owner, repo, number});
    const compare = await github.repos.compareCommits({
      owner,
      repo,
      base: pr.data.base.sha,
      head: pr.data.head.sha
    });

    console.log(compare);

    // auth for repo
    // get list of commits with status for each
    res.render('pull', {compare: compare.data, pr: pr.data});
  });



  return app;
}
