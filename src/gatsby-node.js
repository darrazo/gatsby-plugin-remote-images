const { createRemoteFileNode } = require(`gatsby-source-filesystem`)
const get = require('lodash/get')

exports.onCreateNode = async (
  { node, actions, store, cache, createNodeId },
  options
) => {
  const { createNode } = actions
  const {
    nodeType,
    imagePath,
    name = 'localImage',
    auth = {},
    ext = null,
  } = options

  let fileNodes;
  let urls;
  if (node.internal.type === nodeType) {
    try {
      const arrayPath = imagePath.split(".");
      urls = deepfirstsearch(node, arrayPath);
      fileNodes = await Promise.all(urls.map(urlObject => {
        const param = {
          url: ext ? `${urlObject.url}${ext}` : urlObject.url,
          store,
          cache,
          createNode,
          createNodeId,
          auth,
          ext
        }
        const promise = createRemoteFileNode(param);
        promise.then(result => urlObject.fileNode = result);
        return promise;
      }));
    } catch (e) {
      console.error('gatsby-plugin-remote-images ERROR:', e);
    }
  } // Adds a field `localImage` or custom name to the node
  // ___NODE appendix tells Gatsby that this field will link to another node
  if (fileNodes){
    urls.map(urlObject => {
        urlObject['parentNode'][`${name}___NODE`] = urlObject.fileNode.id;
      }
    )
  }
}

const deepfirstsearch = (node, arrayPath) => {
  const stack = [{'node': node, 'arrayIndex': 0}];
  let currentNode;
  let base;
  let urls = [];
  while (stack.length > 0){
    currentNode = stack.pop();
    base = arrayPath[currentNode.arrayIndex]
    const child = get(currentNode.node, base);
    const index = currentNode.arrayIndex + 1;
    if (child){
      if (index == arrayPath.length){
        if (Array.isArray(child)){
          child.filter(typeof value === 'string').map(value => {
           urls.push(
            {'parentNode': currentNode.node,
             'url': value})
            });
        }
        else{
          if (typeof child === 'string'){
            urls.push({'parentNode': currentNode.node,
            'url': child});
          }
        }
      }
      else{
        if (typeof child === 'object'){
          if (Array.isArray(child)){
            child.map(childNode => stack.push({node: childNode, arrayIndex: index}));
          }
          else{
            stack.push({node: child, arrayIndex: index});
          }
        }
      }
    }
  }
  return urls;
}