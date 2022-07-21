const { types: t } = require('@marko/compiler');
const { getTagDef, isDynamicTag, isNativeTag, isAttributeTag } = require('@marko/babel-utils');

function isApi(path, type) {
  return path.hub.file.path.node.extra?.___featureType === type;
}

/** @type {import("@marko/compiler").types.Visitor} */
const trackComponents = {
  // A "Program" is the Marko file in this case
  Program: {
    exit(program) {
      // if(isApi(program, 'class')) {
      //   program.node.body = addEventListener('comp?').concat(program.node.body);
      // } else {
      //   program.node.body = addEventListener('_comp?').concat(program.node.body);
      //   // console.log(program.hub.file.path.node.extra);
      // }
    }
  }
}

function addEventListener(identifier) {
  return [
    // component?.once('update', () => {console.log(component.state)});
    t.expressionStatement(
      t.callExpression(
        t.memberExpression(
          t.identifier(identifier),
          t.identifier('once')
        ),
        [
          t.stringLiteral('update'),
          t.arrowFunctionExpression(
            [],
            t.blockStatement([
              t.expressionStatement(
                t.callExpression(
                  t.identifier('console'),
                  [
                    t.stringLiteral('log'),
                    t.memberExpression(
                      t.identifier('component'),
                      t.identifier('state')
                    )
                  ]
                )
              )
            ])
          )
        ]
      )
    )
  ]
}

module.exports = [
  trackComponents
];
