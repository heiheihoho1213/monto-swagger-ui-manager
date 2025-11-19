import { Component, HostBinding, OnInit, ViewChild } from '@angular/core';
import { MatAccordion } from '@angular/material/expansion';
import { fromEvent } from 'rxjs';
import { debounceTime, filter, map } from 'rxjs/operators';
import { API_ID_PREFIX } from 'src/app/share/const';
import {
  CopyService,
  ScrollInoViewService,
  StoreService,
  TypeService,
} from 'src/app/share/service';
import { Any, StoreData } from 'src/app/share/share.model';
import { ApiItem, ApiParameters } from '../api.model';

@Component({
  selector: 'app-api-list',
  templateUrl: './api-list.component.html',
  styleUrls: ['./api-list.component.less'],
})
export class ApiListComponent implements OnInit {
  @ViewChild(MatAccordion) accordion!: MatAccordion;
  // 在 apiItems.length > 0 时设置样式
  @HostBinding('style.paddingRight') get paddingRight(): string {
    return this.apiItems.length > 0 ? '220px' : '0';
  }
  @HostBinding('style.paddingTop') get paddingTop(): string {
    return this.apiItems.length > 0 ? '220px' : '0';
  }
  @HostBinding('style.height') get height(): string {
    return '100%';
  }

  apiItems: ApiItem[] = [];

  expandeds: boolean[] = [];

  ID_PREFIX = API_ID_PREFIX;

  activedIndex!: number;

  selectionStartIndex: number | null = null;

  expandedStateBeforeSelection?: boolean;

  allowKeys = new Set(['KeyU', 'KeyD', 'KeyP']);

  selectedApis: boolean[] = [];

  selectAll = false;

  emptyData = true;

  get disabled(): boolean {
    return !this.selectedApis.some(Boolean);
  }

  constructor(
    private store: StoreService,
    private scroll: ScrollInoViewService,
    private copyService: CopyService,
    private typeService: TypeService
  ) { }

  ngOnInit(): void {
    this.store.getData$().subscribe((data: StoreData) => {
      this.emptyData = data.projects.length === 0;
      this.selectedApis = data.apiItems.map(() => false);
      this.apiItems = data.apiItems;
      this.expandeds = data.expandeds;
      this.expandeds[data.index.apiIndex] = true;
      this.activedIndex = data.index.apiIndex;
      this.scroll.tick_then(() => {
        this.scroll.to(this.ID_PREFIX + this.activedIndex);
      });
    });

    fromEvent(window, 'keyup')
      .pipe(
        debounceTime(500),
        filter(() => document.activeElement?.tagName !== 'INPUT'),
        filter((evt) => this.allowKeys.has((evt as KeyboardEvent).code)),
        map((evt) => (evt as KeyboardEvent).code)
      )
      .subscribe((code: string) => {
        const api = this.store.getCurApiItem();

        if (api !== undefined) {
          (this as Any)[code](api);
        }
      });
  }

  KeyU(apiItem: ApiItem): void {
    this.copyService.copy(apiItem.__info.urlForCopy);
  }

  KeyD(apiItem: ApiItem): void {
    this.copyService.copy(apiItem.__info.description);
  }

  KeyP(): void {
    const selector = '.api-item-actived .parameter-fields';
    const pEl = document.querySelector(selector) as HTMLDivElement;

    if (!pEl) {
      return;
    }

    this.copyService.copy(pEl.dataset.copyselector || '', true);
  }

  selectAllApi(checked: boolean): void {
    this.selectAll = checked;
    this.selectedApis = this.apiItems.map(() => checked);
  }

  someSelected(): boolean {
    return this.selectedApis.filter(Boolean).length > 0 && !this.selectAll;
  }

  updateAllComplete(): void {
    this.selectAll = this.selectedApis.every(Boolean);
  }

  recordStart(index: number): void {
    this.selectionStartIndex = index;
    this.expandedStateBeforeSelection = this.expandeds[index];
  }

  shouldAvoidSelect(event: MouseEvent, index: number): void {
    const selection = window.getSelection();
    const hasTextSelection =
      !!selection && !selection.isCollapsed && selection.toString().trim();

    if (!hasTextSelection) {
      this.resetSelectionState();
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (
      this.selectionStartIndex === index &&
      this.expandedStateBeforeSelection !== undefined
    ) {
      this.expandeds[index] = this.expandedStateBeforeSelection;
    }

    this.resetSelectionState();
  }

  private resetSelectionState(): void {
    this.selectionStartIndex = null;
    this.expandedStateBeforeSelection = undefined;
  }

  updateUrl(apiIndex: number): void {
    this.activedIndex = apiIndex;
    this.store.updateUrl(apiIndex);
  }

  genServiceCall(): string {
    const codes = this.apiItems
      .filter((_, index) => this.selectedApis[index])
      .map((api) => {
        const {
          responses,
          __info: { operationId, method },
        } = api;

        let resType = 'any';
        const res200 = (responses[200] as unknown) as ApiParameters;

        if (res200) {
          resType = this.typeService.getType(res200);
        }

        const fnName = operationId.replace(/Using.*/, '');
        let params = this.copyService.getTexts(api.argSelector);

        if (params) {
          params = `/* ${params} */`;
        }

        return method === 'get'
          ? `${fnName}() {
  this.loading = true;
  this.apiService.${fnName}(${params}).subscribe((res) => {
    // this.xxx = res.data;
    this.loading = false;
  });
}`
          : `
        ${fnName}() {
    this.loading = true;
    this.apiService.${fnName}(${params}).subscribe(
      (res: any) => {
        // this.xxx = res.data;
        this.loading = false;
      },
      (error) => {
        this.loading = false;
        this.modal.error({ message: error.message });
      }
    );
  }
        `;
      });

    const code = codes.join('\n\n');

    this.copyService.copy(code);

    return code;
  }

  genService(): string {
    const codes = this.apiItems
      .filter((_, index) => this.selectedApis[index])
      .map((api) => {
        const {
          responses,
          __info: { operationId, method, urlForCopy, description },
        } = api;

        let resType = 'any';
        const res200 = (responses[200] as unknown) as ApiParameters;

        if (res200) {
          resType = this.typeService.getType(res200);
        }

        const fnName = operationId.replace(/Using.*/, '');
        const params = this.copyService.getTexts(api.argSelector);
        const code = `// ${description}
${fnName}(${params}): Observable<${resType}> {
  return this.api.${method}(${urlForCopy});
}`;

        return code;
      });

    const service = codes.join('\n\n');

    this.copyService.copy(service);

    return service;
  }

  genAxiosService(): string {
    const codes = this.apiItems
      .filter((_, index) => this.selectedApis[index])
      .map((api) => {
        const {
          responses,
          __info: { operationId, method, urlForCopy, description },
        } = api;

        let resType = 'any';
        const res200 = (responses[200] as unknown) as ApiParameters;

        if (res200) {
          resType = this.typeService.getType(res200);
        }

        const fnName = operationId.replace(/Using.*/, '');
        const params = this.copyService.getTexts(api.argSelector);

        // 将 Angular 的模板字符串格式转换为 React 的参数格式
        const reactUrl = urlForCopy.replace(/\$\{/g, '${');
        const hasParams = params && params.trim().length > 0;

        // 根据请求方法构建 Axios 调用
        let axiosCall = '';
        if (hasParams) {
          if (method === 'get' || method === 'delete') {
            // GET/DELETE 请求：URL 中可能有路径参数，查询参数通过 config.params 传递
            // 这里简化处理，假设参数已经在 URL 模板中或作为查询参数
            axiosCall = `axios.${method}(\`${reactUrl}\`, { params: ${params} })`;
          } else {
            // POST/PUT/PATCH 请求：参数作为 data（请求体）
            axiosCall = `axios.${method}(\`${reactUrl}\`, ${params})`;
          }
        } else {
          axiosCall = `axios.${method}(\`${reactUrl}\`)`;
        }

        const code = `// ${description}
export const ${fnName} = async (${hasParams ? params : ''}): Promise<${resType}> => {
  const response = await ${axiosCall};
  return response.data;
};`;

        return code;
      });

    const service = codes.join('\n\n');

    this.copyService.copy(service);

    return service;
  }

  genAxiosServiceCall(): string {
    const codes = this.apiItems
      .filter((_, index) => this.selectedApis[index])
      .map((api) => {
        const {
          responses,
          __info: { operationId, method },
        } = api;

        let resType = 'any';
        const res200 = (responses[200] as unknown) as ApiParameters;

        if (res200) {
          resType = this.typeService.getType(res200);
        }

        const fnName = operationId.replace(/Using.*/, '');
        const handleFnName = 'handle' + fnName.charAt(0).toUpperCase() + fnName.slice(1);
        let params = this.copyService.getTexts(api.argSelector);

        if (params) {
          params = `/* ${params} */`;
        }

        return method === 'get'
          ? `const [loading, setLoading] = useState(false);
const [data, setData] = useState<${resType} | null>(null);

const ${handleFnName} = useCallback(async () => {
  setLoading(true);
  try {
    const result = await ${fnName}(${params});
    setData(result);
    // setXxx(result.data);
  } catch (error) {
    console.error('Error:', error);
    // message.error(error.message);
  } finally {
    setLoading(false);
  }
}, []);`
          : `const [loading, setLoading] = useState(false);
const [data, setData] = useState<${resType} | null>(null);

const ${handleFnName} = useCallback(async () => {
  setLoading(true);
  try {
    const result = await ${fnName}(${params});
    setData(result);
    // setXxx(result.data);
    // message.success('操作成功');
  } catch (error) {
    console.error('Error:', error);
    // message.error(error.message || '操作失败');
  } finally {
    setLoading(false);
  }
}, []);`;
      });

    const code = codes.join('\n\n');

    this.copyService.copy(code);

    return code;
  }

  setCopyClass(argSelector: string, apiItem: ApiItem): void {
    apiItem.argSelector = argSelector;
  }
}
