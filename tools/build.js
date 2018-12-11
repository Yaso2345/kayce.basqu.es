const showdown = require('showdown'),
    converter = new showdown.Converter(),
    fs = require('fs'),
    buildDirectory = 'build',
    blogSource = 'src/posts',
    blogDestination = `${buildDirectory}/blog`,
    handlebars = require('handlebars'),
    source = fs.readFileSync('src/templates/base.html', 'utf8'),
    template = handlebars.compile(source),
    subscription = fs.readFileSync('src/partials/subscription.html', 'utf8'),
    js = require('uglify-js'),
    css = require('clean-css'),
    html = require('html-minifier'),
    postIndexData = [],
    categories = {};

function getName(filename) {
  return filename.substring(0, filename.indexOf('.'));
}

function getStylesheet() {
  const src = fs.readFileSync('src/static/styles/main.css', 'utf8');
  return new css().minify(src).styles;
}

function getScript() {
  return fs.readFileSync('src/static/scripts/main.js', 'utf8');
  // TODO minification not working
  //return js.minify(src).code;
}

function getTitle(content) {
  const end = content.indexOf('</h1>');
  const start = content.substring(0, end).lastIndexOf('>') + 1;
  return content.substring(start, end);
}

function isTechnicalWritingPost(content) {
  const query = '<p id="category">';
  const startIndex = content.indexOf(query) + query.length;
  const shiftedContent = content.substring(startIndex);
  const endIndex = shiftedContent.indexOf('</p>');
  return shiftedContent.substring(0, endIndex) === 'Technical Writing';
}

function getDate(html) {
  // TODO use the datetime attribute instead
  const end = html.indexOf('</time>');
  const start = html.substring(0, end).lastIndexOf('>') + 1;
  return html.substring(start, end);
}

// TODO not working
function getSummary(html) {
  const search = '<p id="summary">';
  const start = html.indexOf(search) + search.length;
  const end = html.substring(start, html.length).indexOf('>');
  return html.substring(start, end);
}

function compile(path, filename, destination) {
  const markdownContent = fs.readFileSync(`${path}/${filename}`, 'utf8');
  const htmlContent = converter.makeHtml(markdownContent);
  const title = getTitle(htmlContent),
  date = getDate(htmlContent),
  name = getName(filename),
  summary = getSummary(htmlContent);
  data = {
    body: htmlContent,
    title: title,
    script: getScript(),
    stylesheet: getStylesheet()
  };
  if (isTechnicalWritingPost(htmlContent)) data.subscription = subscription;
  if (destination.includes('/blog/') && !filename.includes('index')) {
    post = {};
    post.url = `/blog/${name}.html`;
    post.title = title;
    post.date = date;
    postIndexData.push(post);
  }
  const unminifiedHtml = template(data);
  const minifiedHtml = html.minify(unminifiedHtml, {
    collapseWhitespace: true
  });
  fs.writeFileSync(destination, minifiedHtml);
}

const indexes = {
  home: { source: 'index.md', destination: 'build/index.html' },
  blog: { source: 'posts/index.md', destination: 'build/blog/index.html' },
  portfolio: { source: 'portfolio/index.md', destination: 'build/portfolio/index.html' }
};

for (let key in indexes) {
  compile('src/indexes/', indexes[key].source, indexes[key].destination);
}

const posts = fs.readdirSync(blogSource);

posts.forEach(file => compile('src/posts/', file, `build/blog/${getName(file)}.html`));

let postIndexItems = [];

postIndexData.forEach(post => {
  post.html =
    `<li class="post">
       <a class="title" href="${post.url}">${post.title}</a>
       <time>${post.date}</time>
     </li>`;
});

sortedPostIndexData = postIndexData.sort((a, b) => {
  return new Date(b.date).getTime() - new Date(a.date).getTime();
});

let postIndexContent = '<h1>Posts</h1><ul class="list">';

postIndexData.forEach(post => {
  postIndexContent += post.html;
});

postIndexContent += '</ul>';

const unminifiedPostIndex = template({
  body: postIndexContent,
  title: "Posts",
  script: getScript(),
  stylesheet: getStylesheet()
});

minifiedPostIndex = html.minify(unminifiedPostIndex, {
  collapseWhitespace: true
});

fs.writeFileSync('build/blog/index.html', minifiedPostIndex);
