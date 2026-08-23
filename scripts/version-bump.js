import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const args = process.argv.slice(2);
const type = args[0];

if (!['major', 'minor', 'patch'].includes(type)) {
  console.error('Error: Please specify a valid version bump type: major, minor, or patch.');
  console.error('Usage: node scripts/version-bump.js <type>');
  process.exit(1);
}

try {
  // 1. Safety Check: Ensure tracking files are clean
  let hasUncommittedChanges = false;
  try {
    const gitStatus = execSync('git status --porcelain package.json').toString().trim();
    if (gitStatus.length > 0) {
      hasUncommittedChanges = true;
    }
  } catch (e) {
    hasUncommittedChanges = true;
  }

  // 2. Execute NPM Version Bump (updates package.json AND package-lock.json without committing)
  console.log(`\x1b[36mExecuting npm version bump (${type})...\x1b[0m`);
  const bumpOutput = execSync(`npm --no-git-tag-version version ${type}`).toString().trim();
  
  const newVersion = bumpOutput.split('\n').pop().trim().replace(/^v/, '');
  const tagVersion = `v${newVersion}`;

  console.log(`\x1b[32mSuccessfully bumped package versions to \x1b[33m${newVersion}\x1b[0m`);

  // 3. Git Automation: Commit & Tag
  if (hasUncommittedChanges) {
    console.warn('\x1b[33mWarning: package.json had uncommitted changes prior to this bump.\x1b[0m');
    console.warn('\x1b[33mSkipping automatic git commit and tagging to prevent bundling unrelated changes.\x1b[0m');
  } else {
    try {
      // Stage package.json
      execSync('git add package.json');
      

      
      // Commit
      const commitMsg = `chore(release): bump version to ${newVersion}`;
      execSync(`git commit -m "${commitMsg}"`);
      console.log(`\x1b[32mSuccessfully committed: "${commitMsg}"\x1b[0m`);

      // Create an annotated Git Tag (critical for CI/CD pipelines)
      execSync(`git tag -a ${tagVersion} -m "Release ${tagVersion}"`);
      console.log(`\x1b[32mSuccessfully created git tag: \x1b[33m${tagVersion}\x1b[0m`);
      
      console.log(`\n\x1b[36mNext steps:\x1b[0m Run \x1b[33mgit push --follow-tags\x1b[0m to push the commit and release tag to the remote.`);
    } catch (e) {
      console.error('\x1b[31mFailed to commit or tag changes in git.\x1b[0m');
      console.error(e.message);
    }
  }

} catch (error) {
  console.error(`\x1b[31mError during version bump:\x1b[0m ${error.message}`);
  process.exit(1);
}
