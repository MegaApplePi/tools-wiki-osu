const fs = require("fs");
const path = require("path");

function walkFiles(dir) {
  return fs.readdirSync(dir).reduce((files, file) => {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      return files.concat(walkFiles(path.join(dir, file)));
    }
    return files.concat(path.join(dir, file));
  }, []);
}

const $pathInput = document.querySelector(".path-input");
const $pathConfirm = document.querySelector(".path-confirm");
const $path = document.querySelector(".path");
const $progress = document.querySelector(".progress");
const $progressStatus = document.querySelector(".progress-status");
const $menu = document.querySelector(".menu");
const $menuLinkHere = document.querySelector(".menu-link-here");
const $menuLinkPopular = document.querySelector(".menu-link-popular");
const $menuLinkExternal = document.querySelector(".menu-link-external");
const $menuPageOrphaned = document.querySelector(".menu-page-orphaned");
const $menuPageDeadend = document.querySelector(".menu-page-deadend");
const $list = document.querySelector(".list");
const $listBack = document.querySelector(".list-back");
const $listDesc = document.querySelector(".list-desc");
const $listList = document.querySelector(".list-list");
const $result = document.querySelector(".result");
const $resultBack = document.querySelector(".result-back");

let repoPath = localStorage.getItem("path");
let filePaths;
let regexLink = /(?:!?\[.*?\][(](?:(?!#.+?)(?:(.+?)(?:#.+?)?(?:\s".*?")?))[)])|(?:^\[.*?\]:\s(?:(?!#.+?)(?:(.+?)(?:#.+?)?(?:\s".*?")?))$)/gm;
let lists = Object.seal({
  "links": null,
  get "hereLinksThere"() {
    return this.links;
  },
  "whatLinksHere": null,
  "popular": null,
  "orphaned": null,
  "deadend": null,
  "long": null,
  get "short"() {
    if (this.long) {
      return this.long.reverse();
    }
    return null;
  },
  "external": null
});

function postParse() {
  $progressStatus.textContent = "3 / 3 | Running post link checks";

  // orphaned (dependent on "what links here")
  for (let filePath in lists.whatLinksHere) {
    if (lists.whatLinksHere.hasOwnProperty(filePath)) {
      if (lists.whatLinksHere[filePath].length === 0) {
        lists.orphaned.push(filePath);
      }
    }
  }

  // deadends (dependent on "here links there")
  for (let filePath in lists.hereLinksThere) {
    if (lists.hereLinksThere.hasOwnProperty(filePath)) {
      if (lists.hereLinksThere[filePath].length === 0) {
        lists.deadend.push(filePath);
      }
    }
  }

  // popular (dependent on "what links here")
  for (let filePath in lists.whatLinksHere) {
    if (lists.whatLinksHere.hasOwnProperty(filePath)) {
      lists.popular.push([filePath, lists.whatLinksHere[filePath].length]);
    }
  }
  lists.popular.sort((a, b) => {
    if (a[1] < b[1]) {
      return 1;
    } else if (a[1] > b[1]) {
      return -1;
    }
    return 0;
  });

  // long pages // short pages are handled on the fly
  lists.long.sort((a, b) => {
    if (a[1] < b[1]) {
      return 1;
    } else if (a[1] > b[1]) {
      return -1;
    }
    return 0;
  });

  $progress.dataset.hidden = "";
  delete $menu.dataset.hidden;
}

function parseLinks(i = 0) {
  let fileName = filePaths[i];
  let locale = fileName.split(path.sep).pop().split(".").shift(); // eslint-disable-line
  $progressStatus.textContent = `2 / 3 | Matching links to files >> ${fileName}`;

  // what links here
  lists.whatLinksHere[filePaths[i]] = [];
  for (let fileLink in lists.links) {
    if (lists.links.hasOwnProperty(fileLink)) {
      if (lists.links[fileLink].includes(fileName)) {
        lists.whatLinksHere[filePaths[i]].push(fileLink);
      }
    }
  }

  // external links
  lists.whatLinksHere[filePaths[i]] = [];
  for (let fileLink in lists.links) {
    if (lists.links.hasOwnProperty(fileLink)) {
      if (lists.links[fileLink]) {
        lists.whatLinksHere[filePaths[i]].push(fileLink);
      }
    }
  }

  if (filePaths[i + 1]) {
    setTimeout(() => {
      parseLinks(i + 1);
    }, 1);
  } else {
    postParse();
  }
}

function parseFolders(i = 0) {
  // don't .shift(), we still want the original list
  let filePath = filePaths[i];
  $progressStatus.textContent = `1 / 3 | Searching for links >> ${filePath}`;

  if (filePath.split(".").pop() === "md") {
    let fileName = filePath.split(path.sep).pop();
    lists.links[filePath] = [];

    lists.long.push([filePath, fs.statSync(filePath).size]);

    let contents = fs.readFileSync(filePath, "utf8");

    let inlineLinks;
    while ((inlineLinks = regexLink.exec(contents)) !== null) {
      if (inlineLinks) {
        // need to fully qualify the link for future matching
        let link;
        if (inlineLinks[1]) {
          link = inlineLinks[1];
        } else if (inlineLinks[2]) {
          link = inlineLinks[2];
        }

        // TOFIX some articles might link using the full URL
        if (!(/^(?:https?|mailto):/i).test(link)) {
          if ((/^\/wiki\//).test(link)) { // /wiki/ links
            link = path.resolve(repoPath, `../${link}`);
            if (!["jpeg", "jpg", "png", "gif"].includes(link.split(".").pop())) {
              link = path.resolve(link, `./${fileName}`);
            }
          } else if ((/^\/.+?\//).test(link)) { // / links (other osu.ppy.sh links)
            link = `https://osu.ppy.sh${link}`;
          } else if ((/^\.{2}\//).test(link)) { // ../ links
            link = path.resolve(`${filePath}/..`, link);
            if (!["jpeg", "jpg", "png", "gif"].includes(link.split(".").pop())) {
              link = path.resolve(link, `./${fileName}`);
            }
          } else { // ./ or current directory links
            link = path.resolve(`${filePath}/..`, link);
            if (!["jpeg", "jpg", "png", "gif"].includes(link.split(".").pop())) {
              link = path.resolve(link, `./${fileName}`);
            }
          }
        }

        lists.links[filePath].push(link);
      }
    }
  }

  if (filePaths[i + 1]) {
    setTimeout(() => {
      parseFolders(i + 1);
    }, 1);
  } else {
    parseLinks(0);
  }
}

function readRepoDir() {
  $path.dataset.hidden = "";
  delete $progress.dataset.hidden;
  filePaths = walkFiles(repoPath);
  lists.links = {};
  lists.whatLinksHere = {};
  lists.orphaned = [];
  lists.popular = [];
  lists.deadend = [];
  lists.long = [];
  lists.external = {};
  parseFolders(0);
}

if (repoPath && fs.existsSync(repoPath)) {
  readRepoDir();
} else {
  delete $path.dataset.hidden;
}

function preventDefault(event) {
  event.preventDefault();
}
document.addEventListener("dragover", preventDefault);
document.addEventListener("drag", preventDefault);

function document_drop(event) {
  $pathInput.value = event.dataTransfer.files[0].path;
}
document.body.addEventListener("drop", document_drop);

function $pathConfirm_click() {
  if ((/[/\\]wiki[/\\]?$/).test($pathInput.value) && fs.existsSync($pathInput.value)) {
    localStorage.setItem("path", $pathInput.value);
    readRepoDir();
  } else {
    // TODO notify that something wrong happened
  }
}
$pathConfirm.addEventListener("click", $pathConfirm_click);

// TODO complete menuLinkHere_click
function $menuLinkHere_click() {
  $listDesc.textContent = "Internal pages that link to here. (/wiki/ only)";
  $menu.dataset.hidden = "";
  delete $list.dataset.hidden;

  for (let filePath in lists.whatLinksHere) {
    if (lists.whatLinksHere.hasOwnProperty(filePath)) {
      let $li = document.createElement("li");
      $li.textContent = filePath;

      $listList.insertAdjacentElement("beforeEnd", $li);
    }
  }
}
$menuLinkHere.addEventListener("click", $menuLinkHere_click);

function $menuLinkPopular_click() {
  $listDesc.textContent = "List of most referenced files. (/wiki/ only)";
  $menu.dataset.hidden = "";
  delete $list.dataset.hidden;

  for (let item of lists.popular) {
    let $li = document.createElement("li");
    $li.textContent = `${item[0]} (${item[1]} references)`;

    $listList.insertAdjacentElement("beforeEnd", $li);
  }
}
$menuLinkPopular.addEventListener("click", $menuLinkPopular_click);

function $menuLinkExternal_click() {
  $listDesc.textContent = "Pages with links that go outside osu!'s domain.";
  $menu.dataset.hidden = "";
  delete $list.dataset.hidden;

  for (let filePath in lists.external) {
    if (lists.external.hasOwnProperty(filePath)) {
      let $li = document.createElement("li");
      $li.textContent = filePath;

      $listList.insertAdjacentElement("beforeEnd", $li);
    }
  }
}
$menuLinkExternal.addEventListener("click", $menuLinkExternal_click);

function $menuPageOrphaned_click() {
  $listDesc.textContent = "The following pages are not linked from other pages.";
  $menu.dataset.hidden = "";
  delete $list.dataset.hidden;

  for (let filePath of lists.orphaned) {
    let $li = document.createElement("li");
    $li.textContent = filePath;

    $listList.insertAdjacentElement("beforeEnd", $li);
  }
}
$menuPageOrphaned.addEventListener("click", $menuPageOrphaned_click);

function $menuPageDeadend_click() {
  $listDesc.textContent = "The following pages do not link to other pages.";
  $menu.dataset.hidden = "";
  delete $list.dataset.hidden;

  for (let filePath of lists.deadend) {
    let $li = document.createElement("li");
    $li.textContent = filePath;

    $listList.insertAdjacentElement("beforeEnd", $li);
  }
}
$menuPageDeadend.addEventListener("click", $menuPageDeadend_click);

function $listBack_click() {
  while ($listList.firstChild) {
    $listList.firstChild.remove();
  }
  $list.dataset.hidden = "";
  delete $menu.dataset.hidden;
}
$listBack.addEventListener("click", $listBack_click);

function $resultBack_click() {
  $listDesc.textContent = "";
  $result.dataset.hidden = "";
  delete $list.dataset.hidden;
}
$resultBack.addEventListener("click", $resultBack_click);
