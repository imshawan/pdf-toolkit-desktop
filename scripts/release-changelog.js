import { execSync } from 'child_process';

function runCommand(command, ignoreError = false) {
  try {
    return execSync(command, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch (error) {
    if (ignoreError) {
      return '';
    }
    throw error;
  }
}

try {
  // Ensure we are in a git repository
  try {
    runCommand('git rev-parse --is-inside-work-tree');
  } catch (e) {
    console.error('Error: Not a git repository.');
    process.exit(1);
  }

  // Get the most recent tag
  const currentTag = runCommand('git describe --tags --abbrev=0', true);

  if (!currentTag) {
    console.log('## Changelog (All Commits)\n');
    console.log(runCommand("git log --pretty=format:'- %s (`%h`)' --no-merges"));
    console.log('');
    process.exit(0);
  }

  // Get the tag immediately preceding the current tag
  const previousTag = runCommand(`git describe --tags --abbrev=0 "${currentTag}^"`, true);

  if (!previousTag) {
    console.log(`## Changelog (All Commits up to ${currentTag})\n`);
    console.log(runCommand(`git log "${currentTag}" --pretty=format:'- %s (\`%h\`)' --no-merges`));
    console.log('');
  } else {
    console.log(`## Changelog between \`${previousTag}\` and \`${currentTag}\`\n`);
    console.log(runCommand(`git log "${previousTag}..${currentTag}" --pretty=format:'- %s (\`%h\`)' --no-merges`));
    console.log('');
  }
} catch (error) {
  console.error('Failed to generate changelog:', error.message);
  process.exit(1);
}
