/**
 * 1. createElement
 * 2. render函数
 * 3. requestIdleCalback调度逻辑
 * 4. fiber架构实现
 * 5. commit阶段
 * 6. reconcile调和逻辑
 * 7. 函数组件支持
 * 8. hooks实现
 * 9. 使用hooks模拟实现class component
 */

// 为了构建虚拟DOM
// 下一个单元任务 render 会初始化第一个任务
let nextUnitOfWork = null;
// 保存全局fiber的根节点并且一直保存着根节点 在render时初始化；
let wipRoot = null;
let currentRoot = null;
let deletions = null;
// 正在工作的fiber
let wipFiber = null;
let hookIndex = null;
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
/**
 * 通过虚拟dom新建dom元素
 * @param {虚拟dom} vdom
 */
function createDom(vdom) {
  const dom =
    vdom.type === 'TEXT'
      ? document.createTextNode('')
      : document.createElement(vdom.type);

  Object.keys(vdom.props)
    .filter((key) => key !== 'children')
    .forEach((name) => {
      dom[name] = vdom.props[name];
    });
  return dom;
}
/**
 *
 * @param {虚拟dom} vdom
 * @param {*} container
 */
function render(vdom, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [vdom],
    },
    base: currentRoot, // 存储当前的节点用来记录，恢复时使用
  };
  deletions = [];
  nextUnitOfWork = wipRoot;
  console.dir('wipRoot==', wipRoot);
  // // 传统方式对两棵树进行diff，是通过递归， 递归就会变卡顿fiber中这里直接注释掉；
  // vdom.props.children.forEach((child) => {
  //   render(child, dom);
  // });

  // container.appendChild(dom);
}

// ---------- start 任务调度 --------
// 这里为了分离真实DOM操作，记录起来，一起推送
// 构建虚拟DOM过程可以中断，但是真实DOM的append必须一气呵成
function commitRoot() {
  // 需要删除的节点，直接通过commitWorker删除即可
  deletions.forEach(commitWorker);
  commitWorker(wipRoot.child);
  currentRoot = null;
  // 防止重复工作
  wipRoot = null;
}
// 真正的渲染函数
function commitWorker(fiber) {
  if (!fiber) {
    return;
  }

  // 函数型组件，无DOM属性，找DOM属性需向上查找；
  let domparentFiber = fiber.parent;
  while (!domparentFiber.dom) {
    domparentFiber = domparentFiber.parent;
  }
  const domParent = domparentFiber.dom;
  if (fiber.type === 'PLACEMENT' && fiber.dom != null) {
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === 'DELETION') {
    commitDeletion(fiber, domParent);
    // domParent.removeChild(fiber.dom);
  } else if (fiber.effectTag === 'UPDATE' && fiber.dom !== null) {
    updateDom(fiber.dom, fiber.base.props, fiber.props);
  }
  // domParent.appendChild(fiber.dom);
  commitWorker(fiber.child);
  commitWorker(fiber.slibing);
}
function commitDeletion(fiber, domParent) {
  // 如果fiber
  if (fiber.dom) {
    domParent.removeChild(fiber.dom);
  } else {
    // 递归删除
    commitDeletion(fiber.child, domParent);
  }
}
function updateDom(dom, prevProps, nextProps) {
  // 1.规避children属性
  // 2.老的存在，取消掉
  // 3.新的存在，新增，这里没有做新来相等的判定
  Object.keys(prevProps)
    .filter((name) => name !== 'children')
    .filter((name) => !(name in nextProps))
    .forEach((name) => {
      if (name.slice(0, 2) === 'on') {
        // onClick => click
        dom.removeEventListener(
          name.slice(0, 2).toLowerCase(),
          prevProps[name],
          false
        );
      } else {
        dom[name] = '';
      }
    });
  Object.keys(nextProps)
    .filter((name) => name !== 'children')
    .forEach((name) => {
      if (name.slice(0, 2) === 'on') {
        // onClick => click
        dom.removeEventListener(
          name.slice(0, 2).toLowerCase(),
          prevProps[name],
          false
        );
      } else {
        dom[name] = nextProps[name];
      }
    });
}

// 调度我们的diff或者渲染任务
function workloop(deadline) {
  console.log('deadline===', deadline.timeRemaining());
  console.dir(nextUnitOfWork);

  // nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
  console.log('最后的---', nextUnitOfWork);
  while (nextUnitOfWork && deadline.timeRemaining() > 1) {
    //   // 每个任务都是一个链条，根据当前任务可以拿到迅速找到下一个任务（链表）
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    console.dir(nextUnitOfWork);
  }
  if (!nextUnitOfWork && wipRoot) {
    // 没有下一个任务 并且 根节点还在 就提交当前任务
    commitRoot();
  }
  // requestIdleCallback(workloop);
}

// 自上而下，自左而右遍历所有元素；
function performUnitOfWork(fiber) {
  const isFunctionComponent = fiber.type instanceof Function;
  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
    // dom
    updateHostComponent(fiber);
  }

  // 找下一个任务

  // 先找子元素
  if (fiber.child) {
    return fiber.child;
  }
  // 没有子元素了，就找兄弟元素
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.slibing) {
      return nextFiber.slibing;
    }
    // 没有兄弟元素了，找 TODO
    nextFiber = nextFiber.parent;
  }
  console.log('nextFiber===', nextFiber);
}
// 函数型组件
function updateFunctionComponent(fiber) {
  wipFiber = fiber;
  hookIndex = 0;
  wipFiber.hooks = [];
  const children = [fiber.type(fiber.props)];
  reconcileChildren(fiber, children);
}
// 浏览器 各种节点
function updateHostComponent(fiber) {
  // 获取下一个任务
  // 根据当前的任务，获取下一个
  if (!fiber.dom) {
    // 不是入口
    fiber.dom = createDom(fiber);
  }
  // 真实DOM操作
  // if (fiber.parent) {
  //   fiber.parent.dom.appendChild(fiber.dom);
  // }
  const elements = fiber.props.children;
  reconcileChildren(fiber, elements);
}
// 调和子元素 wipFiber 当前工作的fiber
function reconcileChildren(wipFiber, elements) {
  // 构建fiber结构
  let index = 0;
  let oldFiber = wipFiber.base && wipFiber.base.child;
  let prevSlibing = null;
  while (index < elements.length && oldFiber !== null) {
    let element = elements[index];
    let newFiber = null;
    // 对比oldfiber的状态和当前element

    // 先比较类型
    const sameType = oldFiber && element && oldFiber.type === element.type;
    if (sameType) {
      // 复用节点，更新
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        base: oldFiber,
        effectTag: 'UPDATE',
      };
    }
    if (!sameType && element) {
      // 替换
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        base: oldFiber,
        effectTag: 'PLACEMENT',
      };
    }
    if (!sameType && oldFiber) {
      // 删除
      oldFiber.effectTag = 'DELETION';
      deletions.push(oldFiber);
    }

    if (oldFiber) {
      oldFiber = oldFiber.slibing;
    }

    if (index === 0) {
      //
      wipFiber.child = newFiber;
    } else {
      prevSlibing.prevSlibing = newFiber;
    }
    prevSlibing = wipFiber;
    index++;
    // fiber基本结构构建完成
  }
}

/**
 * fiber = {
 *  dom:
 *  parent:
 *  child:
 *  slibing:
 * }
 */
// 启动空余时间处理
requestIdleCallback(workloop);
// ---------- end 任务调度 --------

function useState(init) {
  const oldHooks =
    wipFiber.base && wipFiber.base.hooks && wipFiber.base.hooks[hookIndex];
  const hook = {
    state: oldHooks ? oldHooks.state : init,
    queue: [],
  };
  const actions = oldHooks ? oldHooks.queue : [];
  actions.forEach((action) => {
    hook.state = action;
  });
  const setState = (action) => {
    hook.queue.push(action);
    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      base: currentRoot,
    };
    nextUnitOfWork = wipRoot;
    deletions = [];
  };
  wipFiber.hooks.push(hook);
  hookIndex++;
  return [hook.state, setState];
}
class Component {
  constructor(props) {
    this.props = props;
  }
}
// 把类组件，转成函数组件；
function transfer(Component) {
  return function (props) {
    const component = new Component(props);
    let [state, setState] = useState(component.state);
    component.props = props;
    component.state = state;
    component.setState = setState;
    return component.render();
  };
}
export default {
  createElement,
  render,
  useState,
  transfer,
};
