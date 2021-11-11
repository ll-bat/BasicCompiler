const APP = (function () {
  function last(str) {
    return str[str.length - 1];
  }
  return {
    last,
  };
})();

const tokenizer = (input) => {
  let tokens = [];
  let current = 0;

  if (APP.last(input) === ";") {
    input += " ";
  } else {
    input += "; ";
  }

  while (current < input.length - 1) {
    const currentChar = input[current];

    const WHITESPACE = /\s+/;
    if (WHITESPACE.test(currentChar)) {
      current++;
      continue;
    }

    if (currentChar === ";" && currentChar === input[input.length - 2]) {
      let token = {
        type: "semi",
        value: ";",
      };
      tokens.push(token);
      current++;
      continue;
    }

    const NUMBER = /^[0-9]+$/;
    if (NUMBER.test(currentChar)) {
      let number = "";

      while (NUMBER.test(input[current++])) {
        number += input[current - 1];
      }

      let token = {
        type: "number",
        value: Number(number),
      };

      tokens.push(token);
      continue;
    }

    if (currentChar === '"') {
      let string = "";

      while (input[++current] !== '"') {
        string += input[current];
      }

      let token = {
        type: "string",
        value: string,
      };

      tokens.push(token);
      current++;
      continue;
    }

    const LETTER = /[a-zA-Z]+/;
    if (LETTER.test(currentChar)) {
      let letters = currentChar;

      while (LETTER.test(input[++current])) {
        letters += input[current];
      }

      if (letters === "set" || letters === "define") {
        tokens.push({
          type: "keyword",
          value: letters,
        });
        continue;
      }

      if (letters === "null") {
        tokens.push({
          type: "null",
          value: letters,
        });
        continue;
      }

      if (letters === "as") {
        tokens.push({
          type: "ident",
          value: letters,
        });
        continue;
      }

      if (letters === "true" || letters === "false") {
        tokens.push({
          type: "boolean",
          value: letters,
        });
        continue;
      }

      tokens.push({
        type: "name",
        value: letters,
      });
      continue;
    }

    throw new TypeError(
      "Unknown Character: " + currentChar + " at position " + current
    );
  }

  return tokens;
};

const parser = (tokens) => {
  let current = 0;

  const walk = () => {
    let token = tokens[current];

    if (token.type === "number") {
      current++;
      let astNode = {
        type: "NumberLiteral",
        value: token.value,
      };
      return astNode;
    }

    if (token.type === "string") {
      current++;
      let astNode = {
        type: "StringLiteral",
        value: token.value,
      };
      return astNode;
    }

    if (token.type === "boolean") {
      current++;
      let astNode = {
        type: "BooleanLiteral",
        value: token.value,
      };
      return astNode;
    }

    if (token.type === "null") {
      current++;
      let astNode = {
        type: "NullLiteral",
        value: token.value,
      };
      return astNode;
    }

    if (token.type === "keyword") {
      let astNode = {
        type: "VariableDeclaration",
        kind: token.value,
        declarations: [],
      };

      token = tokens[++current];

      while (token && token.type !== "semi") {
        astNode.declarations.push(walk());

        token = tokens[current];
      }

      tokens = tokens.filter((token) => token.type !== "semi");

      return astNode;
    }

    if (token.type === "name") {
      current += 2;

      let astNode = {
        type: "VariableDeclarator",
        id: {
          type: "Identifier",
          name: token.value,
        },
        init: walk(),
      };

      return astNode;
    }

    throw new Error(token.type);
  };

  let ast = {
    type: "Program",
    body: [],
  };

  while (current < tokens.length) {
    ast.body.push(walk());
  }

  return ast;
};

const transformer = (ast) => {
  const visitor = {
    VariableDeclaration: {
      enter(node, parent) {
        if (node.kind) {
          if (node.kind === "set") {
            node.kind = "let";
          } else if (node.kind === "define") {
            node.kind = "const";
          }
        }
      },
    },
  };

  const traverser = (ast, visitor) => {
    const traverseArray = (array, parsr) => {
      array.forEach((node) => {
        traverseNode(node, parsr);
      });
    };

    const traverseNode = (node, parsr) => {
      let object = visitor[node.type];

      if (object && object.enter) {
        object.enter(node, parsr);
      }

      switch (node.type) {
        case "Program":
          traverseArray(node.body, node);
          break;
        case "VariableDeclaration":
          traverseArray(node.declarations, node);
          break;
        case "VariableDeclarator":
          traverseNode(node.init, node);
          break;
        case "NumberLiteral":
        case "StringLiteral":
        case "NullLiteral":
        case "BooleanLiteral":
          break;
        default:
          throw new Error(node.type);
      }
    };

    traverseNode(ast, null);
  };

  traverser(ast, visitor);
  return ast;
};

const generator = (node) => {
  switch (node.type) {
    case "NumberLiteral":
    case "BooleanLiteral":
    case "NullLiteral":
      return node.value;
    case "StringLiteral":
      return `${node.value}`;
    case "Identifier":
      return node.name;
    case "VariableDeclarator":
      return generator(node.id) + " = " + generator(node.init);
    case "VariableDeclaration":
      return node.kind + " " + node.declarations.map(generator).join(" ");
    case "Program":
      return node.body.map(generator).join("\n");

    default:
      throw new TypeError(node.type);
  }
};

const compiler = (code) => {
  const tokens = tokenizer(code);
  const ast = parser(tokens);
  const mast = transformer(ast);
  const output = generator(mast);
  return output;
};

const sample = "define lua as 21;";

console.log(compiler(sample));
