import { Injectable } from '@angular/core';
import * as Mock from 'mockjs';
import { Any, AnyObject } from 'src/app/share/share.model';

interface TypeField {
  name: string;
  type: string;
}

interface TypeDeclaration {
  name: string;
  fields: TypeField[];
}

@Injectable({
  providedIn: 'root',
})
export class TypeMockService {
  buildMockCode(code: string): string {
    if (!code) {
      return '// 暂无示例';
    }

    const typeMap = this.parseTypeDeclarations(code);

    if (!typeMap.size) {
      return '// 暂无示例';
    }

    const [rootType] = Array.from(typeMap.keys());
    const mockValue = this.buildMockValue(rootType, typeMap, new Set(), undefined);
    const literal = this.stringifyMock(mockValue);

    const tsBlock = `const sample: ${rootType} = ${literal};`;
    const jsBlock = `const sample = ${literal};`;

    return `${tsBlock}\n\n// JavaScript 示例\n${jsBlock}`;
  }

  private parseTypeDeclarations(code: string): Map<string, TypeDeclaration> {
    const declarations = new Map<string, TypeDeclaration>();
    const classReg = /export class (\w+)\s*\{([\s\S]*?)\n?\}/g;
    let matched: RegExpExecArray | null;

    while ((matched = classReg.exec(code)) !== null) {
      const [, name, body] = matched;
      const normalizedBody = body.replace(/\r/g, '');
      const fields = this.parseFields(normalizedBody);

      declarations.set(name, { name, fields });
    }

    return declarations;
  }

  private parseFields(body: string): TypeField[] {
    const fields: TypeField[] = [];
    const lines = body.split('\n');
    let buffer = '';

    lines.forEach((line) => {
      const trimmed = line.trim();

      if (!trimmed) {
        return;
      }

      buffer += (buffer ? ' ' : '') + trimmed;

      if (trimmed.endsWith(';')) {
        const field = this.extractField(buffer);

        if (field) {
          fields.push(field);
        }
        buffer = '';
      }
    });

    return fields;
  }

  private extractField(source: string): TypeField | null {
    const matched = source.match(/^(\w+)\??:\s*([\s\S]+);$/);

    if (!matched) {
      return null;
    }

    const [, name, type] = matched;

    return {
      name,
      type: type.replace(/\s+/g, ' ').trim(),
    };
  }

  private buildMockValue(
    typeName: string,
    typeMap: Map<string, TypeDeclaration>,
    visits: Set<string>,
    fieldName?: string
  ): Any {
    // 处理枚举类型
    if (typeName.includes('|') && typeName.includes("'")) {
      const enumMatch = typeName.match(/'([^']+)'/);
      return enumMatch ? enumMatch[1] : '';
    }

    // 处理数组类型
    const arrayMatch = typeName.match(/(.+)\[\]$/);
    if (arrayMatch) {
      const itemType = arrayMatch[1].trim();
      return [this.buildMockValue(itemType, typeMap, new Set(visits), fieldName)];
    }

    // 使用 mockjs 根据字段名和类型生成数据
    const mockValue = this.generateMockByFieldNameAndType(typeName, fieldName);
    if (mockValue !== null) {
      return mockValue;
    }

    // 处理自定义类型（递归）
    if (visits.has(typeName) || !typeMap.has(typeName)) {
      return {};
    }

    visits.add(typeName);
    const declaration = typeMap.get(typeName);
    const result: AnyObject = {};

    declaration?.fields.forEach((field) => {
      result[field.name] = this.buildMockValue(
        field.type,
        typeMap,
        new Set(visits),
        field.name
      );
    });

    return result;
  }

  /**
   * 根据字段名和类型使用 mockjs 生成数据
   */
  private generateMockByFieldNameAndType(
    typeName: string,
    fieldName?: string
  ): Any | null {
    const normalizedType = typeName.trim().toLowerCase();
    const normalizedFieldName = fieldName?.toLowerCase() || '';

    // 根据字段名选择特定的 mockjs 规则
    if (normalizedFieldName) {
      // password 相关字段
      if (normalizedFieldName.includes('password') || normalizedFieldName.includes('pwd')) {
        if (normalizedType === 'string') {
          return '******';
        }
      }

      // id 相关字段
      if (normalizedFieldName === 'id' || normalizedFieldName.endsWith('id')) {
        if (normalizedType === 'number' || normalizedType === 'integer') {
          return Mock.mock('@integer(1, 100)');
        }
        if (normalizedType === 'string') {
          return Mock.mock('@id');
        }
      }

      // email 相关字段
      if (normalizedFieldName.includes('email') || normalizedFieldName.includes('mail')) {
        if (normalizedType === 'string') {
          return Mock.mock('@email');
        }
      }

      // phone 相关字段
      if (normalizedFieldName.includes('phone') || normalizedFieldName.includes('mobile') || normalizedFieldName.includes('tel')) {
        if (normalizedType === 'string') {
          return Mock.mock('@phone');
        }
      }

      // url 相关字段
      if (normalizedFieldName.includes('url') || normalizedFieldName.includes('link')) {
        if (normalizedType === 'string') {
          return Mock.mock('@url');
        }
      }

      // name 相关字段
      if (normalizedFieldName.includes('name')) {
        if (normalizedType === 'string') {
          if (normalizedFieldName.includes('first')) {
            return Mock.mock('@first');
          }
          if (normalizedFieldName.includes('last')) {
            return Mock.mock('@last');
          }
          return Mock.mock('@cname');
        }
      }

      // date 相关字段
      if (normalizedFieldName.includes('date') || normalizedFieldName.includes('time')) {
        if (normalizedType === 'string') {
          return Mock.mock('@datetime');
        }
        if (normalizedType === 'number') {
          return Mock.mock('@now');
        }
      }

      // address 相关字段
      if (normalizedFieldName.includes('address')) {
        if (normalizedType === 'string') {
          return Mock.mock('@county(true)');
        }
      }

      // image 相关字段
      if (normalizedFieldName.includes('image') || normalizedFieldName.includes('avatar') || normalizedFieldName.includes('photo')) {
        if (normalizedType === 'string') {
          return Mock.mock('@image("200x200")');
        }
      }

      // title 相关字段
      if (normalizedFieldName.includes('title')) {
        if (normalizedType === 'string') {
          return Mock.mock('@title(3, 5)');
        }
      }

      // description 相关字段
      if (normalizedFieldName.includes('description') || normalizedFieldName.includes('desc') || normalizedFieldName.includes('content')) {
        if (normalizedType === 'string') {
          return Mock.mock('@paragraph');
        }
      }
    }

    // 根据类型选择通用的 mockjs 规则
    switch (normalizedType) {
      case 'string':
        return Mock.mock('@string(5, 10)');
      case 'number':
      case 'integer':
        return Mock.mock('@integer(1, 100)');
      case 'boolean':
        return Mock.mock('@boolean');
      case 'date':
        return Mock.mock('@datetime');
      default:
        return null;
    }
  }

  private stringifyMock(value: Any, indent = 0): string {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return '[]';
      }

      const items = value
        .map((item) => this.stringifyMock(item, indent + 1))
        .map((item) => this.indentLine(item, indent + 1))
        .join(',\n');

      return `[\n${items}\n${this.getIndent(indent)}]`;
    }

    if (value && typeof value === 'object') {
      const entries = Object.entries(value);
      if (entries.length === 0) {
        return '{}';
      }

      const body = entries
        .map(
          ([key, val]) =>
            `${this.getIndent(indent + 1)}${key}: ${this.stringifyMock(
              val,
              indent + 1
            )}`
        )
        .join(',\n');

      return `{\n${body}\n${this.getIndent(indent)}}`;
    }

    return this.stringifyPrimitive(value);
  }

  private stringifyPrimitive(value: Any): string {
    if (value === '__undefined__') {
      return 'undefined';
    }

    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "\\'")}'`;
    }

    return `${value}`;
  }

  private indentLine(value: string, indent: number): string {
    return `${this.getIndent(indent)}${value}`;
  }

  private getIndent(level: number): string {
    return '  '.repeat(level);
  }
}

