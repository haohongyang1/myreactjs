// 原始React代码
// import React from 'react';
// import ReactDOM from 'react-dom';

// 现有自己实现
import React from './hh/index';
let ReactDOM = React;

// 原始JSX组件
// let element = (
//   <div>
//     <h1 id="app">哈</h1>
//     <p>吼</p>
//     <a href="https://maimai.cn">maimai</a>
//   </div>
// );
// ReactDOM.render(element, document.getElementById('root'));
ReactDOM.render(
  React.createElement(
    'div',
    {},
    React.createElement('h1', { id: 'app' }, '哈'),
    React.createElement('p', {}, '吼'),
    React.createElement('a', { href: 'https://maimai.cn' }, 'maimai')
  ),
  document.getElementById('root')
);
// 函数型组件
// function App(props) {
//   return <></>;
// }
