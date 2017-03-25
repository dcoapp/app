const dco = require('./lib/dco');

module.exports = (robot) => {
  robot.on('push', async (event, context) => {
    const github = await robot.auth(event.payload.installation.id);

    return event.payload.commits.map(commit => {
      const signedOff = dco(commit.message);
      return github.repos.createStatus(context.repo({
        sha: commit.id,
        state: signedOff ? 'success' : 'failure',
        target_url: 'https://developercertificate.org/',
        context: "DCO",
        description: 'git commit --signoff'
      }));
    });
  });
};
