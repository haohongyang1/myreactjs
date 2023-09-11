/** @jsxRuntime classic */
function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map((child) => {
        return typeof child === 'object' ? child : createTextElement(child);
      }),
    },
  };
}
function createTextElement(text) {
  return {
    type: 'TEXT',
    props: {
      nodeValue: text,
      children: [],
    },
  };
}
function render(vdom, container) {
  const dom =
    vdom.type === 'TEXT'
      ? document.createTextNode('')
      : document.createElement(vdom.type);

  Object.keys(vdom.props)
    .filter((key) => key !== 'children')
    .forEach((name) => {
      dom[name] = vdom.props[name];
    });
  vdom.props.children.forEach((child) => {
    render(child, dom);
  });
  container.appendChild(dom);
  //   container.innerHTML = `<pre>${JSON.stringify(vdom, null, 2)}</pre>`;
}
export default {
  createElement,
  render,
};
