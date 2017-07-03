module.exports = ({commit, parents}) => {
  const isMerge = parents && parents.length > 1;
  return isMerge || commit.message.includes(signOff(commit));
};

function signOff(commit) {
  return `Signed-off-by: ${commit.author.name} <${commit.author.email}>`;
}
