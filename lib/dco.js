module.exports = ({commit, parents}) => {
  const isMerge = parents && parents.length > 1;
  const expectedSignOff = `Signed-off-by: ${commit.author.name} <${commit.author.email}>`;
  const regex = /^Signed-off-by: (.*) <(.*)>$/m;
  let match;

  if (isMerge) {
    return true;
  } else if ((match = regex.exec(commit.message)) === null) {
    return 'The sign-off is missing. ';
  } else {
    match = regex.exec(commit.message);
    if (match[0] === expectedSignOff) {
      return true;
    } else if (!match[0].includes(`Signed-off-by:`)) {
      return 'The sign-off is missing. ';
    } else if (commit.author.name !== match[1] || commit.author.email !== match[2]) {
      return `Expected "${commit.author.name} <${commit.author.email}>", but got "${match[1]} <${match[2]}>" `;
    }
  }
};
