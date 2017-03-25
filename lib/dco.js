module.exports = commit => {
  const signOff = `Signed-off-by: ${commit.author.name} <${commit.author.email}>`;
  return commit.message.includes(signOff);
};
