import { Octokit } from "octokit";
import readlineSync from "readline-sync";
import fs from "fs-extra";
import simpleGit from "simple-git";

async function main() {
  // Step 1: Remove existing .git folder
  await fs.remove(".git");
  console.log(".git folder removed.");

  // Step 2: Initialize a new Git repository
  const git = simpleGit();
  await git.init();
  console.log("Initialized a new git repository.");

  // Step 3: Gather GitHub Authentication Token
  const githubToken = readlineSync.question(
    "Enter your GitHub authentication token: ",
    {
      hideEchoBack: true,
    }
  );

  // Step 4: Initialize Octokit
  const octokit = new Octokit({
    auth: githubToken,
  });

  // Step 5: Check for existing GitHub repository
  const repoExists = readlineSync.keyInYN(
    "Do you have an existing GitHub repository? "
  );

  let repoName;
  let username;
  if (repoExists) {
    repoName = readlineSync.question(
      "Enter the name of the existing GitHub repository: "
    );
  } else {
    repoName = readlineSync.question(
      "Enter the name for the new GitHub repository: "
    );
    username = readlineSync.question("Enter your GitHub username: ");

    // Step 6: Create a new GitHub repository
    // await octokit.repos.createForAuthenticatedUser({
    //   name: repoName,
    //   private: true, // Set repository visibility
    // });
    // console.log(`Created a new GitHub repository: ${repoName}`);

    await octokit.request("POST /user/repos", {
      name: repoName,
      description: "Quickstart",
      homepage: "https://github.com",
      private: false,
      is_template: true,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
  }

  // Step 7: Add remote and push to GitHub
  await git.addRemote(
    "origin",
    `https://github.com/${username}/${repoName}.git`
  );
  await git.add(".");
  await git.commit("Initial commit");
  await git.branch(["-M", "main"]);

  await git.push("origin", "main");
  console.log("Code pushed to GitHub.");

  // Step 8: Set up .env file
  const envVariables = [
    "DB_USER",
    "DB_PASSWORD",
    "DB_URL",
    "HASURA_ADMIN_SECRET",
    "AUTH0_ISSUER_BASE_URL",
    "AUTH0_BASE_URL",
    "AUTH0_CLIENT_SECRET",
    "AUTH0_CLIENT_ID",
    "AUTH0_SECRET",
  ];

  let envContent = "";
  envVariables.forEach((variable) => {
    const value = readlineSync.question(`Enter value for ${variable}: `);
    envContent += `${variable}=${value}\n`;
  });

  fs.writeFileSync(".env", envContent);
  console.log(".env file created.");

  // Step 9: Add .env to .gitignore
  fs.appendFileSync(".gitignore", "\n.env");
  console.log(".env added to .gitignore.");

  // Step 10: Create GitHub secrets
  const owner = username;
  const repo = repoName;

  for (const variable of envVariables) {
    await octokit.actions.createOrUpdateRepoSecret({
      owner,
      repo,
      secret_name: variable,
      encrypted_value: envContent.split(`${variable}=`)[1].split("\n")[0],
    });
    console.log(`GitHub secret for ${variable} created.`);
  }

  console.log("Project setup completed successfully.");
}

main().catch(console.error);
