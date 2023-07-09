import { Component, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { Table } from 'primeng/table';
import { UUID } from 'angular2-uuid';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
  /** 靜止標題列寬度 */
  static HEADER_FROZEN_WIDTH = 380;
  /** 時間軸固定寬度 */
  static HEADER_WIDTH = 61;

  constructor(
    protected confirmationService: ConfirmationService,
    public cdr: ChangeDetectorRef,
  ) { }

  /** 時間資源表 */
  table: Table
  @ViewChild('table')
  set setTable(table: Table) { this.table = table; }

  /** 唯讀模式 */
  readOnly = false
  /** 房間資料 */
  meetingRoom: MeetingRoom[] = [];
  /** 預約紀錄資料 */
  meetingRoomTimeData: MeetingRoomTime[] = [];
  /** 選擇時間刻度 */
  selectedStep: number = 30;
  /** 顯示時間切換 */
  timeRangeSwitch: boolean = true;
  /** 選取的會議室 */
  selectedRoom: MeetingRoomTimeLineData;
  /** 時間表寬度 */
  timeLineTableMaxwidth: number = 0
  /** 開始選取要使用的時間 */
  hold: boolean = false
  /** 選取的日期陣列 */
  selectedDate: string[] = [];
  /** 會議室資料列表 */
  meetinRoomArray: MeetingRoomTimeLineData[] = [];
  /** 會議開始 / 結束時間 */
  timeAxisOptions: { startHeader: string, endHeader: string, field: string }[] = [];
  /** 每一個子最大寬 */
  tableCellWidth = '65px';

  /** 初始化 */
  ngOnInit(): void {
    // 建立初始資料
    for (let i = 0; i < 10; i++) {
      this.meetingRoom.push(
        {
          pk_id: UUID.UUID(),
          location: '會議室' + i + '號',
          meeting_room_id: i
        } as any
      )
    }
    this.setTimeBorrowOption();
    this.setTimelineGroups();
    this.setTimeLineTableStyle();
    this.timeLineTableMaxwidth = ((this.timeAxisOptions.length * HomeComponent.HEADER_WIDTH) + HomeComponent.HEADER_FROZEN_WIDTH) + 10;
    setTimeout(() => {
      const timeLineTable = document.getElementsByClassName('p-datatable').item(0);
      if (timeLineTable) { timeLineTable.addEventListener('mouseleave', () => { this.endSelectingBorrowTime(); }) }
      this.cdr.detectChanges();
      this.cdr.reattach();
    }, 200);
    this.cdr.detectChanges();
    this.cdr.reattach();
  }

  /** 更改時間刻度 */
  changeSelectedTimeAxis(): void {
    this.setTimeBorrowOption();
    this.setTimeLineTableStyle();
    this.timeLineTableMaxwidth = (this.timeAxisOptions.length * HomeComponent.HEADER_WIDTH) + HomeComponent.HEADER_FROZEN_WIDTH + 10;
  }

  /** 設定借用紀錄Style */
  setTimeLineTableStyle(): void {
    const array = this.meetinRoomArray;
    const newCheck = this.meetinRoomArray.find(ele => ele.new) !== undefined;
    for (let i = 0; i < array.length; i++) {
      const newData = array[i];
      for (let j = 0; j < this.timeAxisOptions.length; j++) {
        const col = this.timeAxisOptions[j];
        /** 在此時間軸內的資料 */
        const fieldData = this.checkMutipleTimeRange(newData, col.field);
        col[newData.content + '_' + col.field] = fieldData.length;
        col[newData.content + '_' + col.field + "_left_border"] = this.setBorder(newData, col.field, 'left');
        col[newData.content + '_' + col.field + "_right_border"] = this.setBorder(newData, col.field, 'right');
        if (col[newData.content + '_' + col.field] == 1 || (col[newData.content + '_' + col.field] == 0 && newData['new'])) {
          col[newData.content + '_' + col.field + "_background"] = this.setBackground(newData, col.field);
          col[newData.content + '_' + col.field + "_right_radius"] = this.setRightBorderRadius(newData, col.field, 1)
          col[newData.content + '_' + col.field + "_left_radius"] = this.setLeftBorderRadius(newData, col.field, 1)
          col[newData.content + '_' + col.field + "_tooltips"] = this.setTooltipContent(newData, col.field, 1)
          col[newData.content + '_' + col.field + "_width"] = this.setMutipleTimeAxisWidth(newData, col.field, 1);
          col[newData.content + '_' + col.field + "_margin_left"] = this.setLeftMargin(fieldData, col.field, 1)
        } else if (col[newData.content + '_' + col.field] >= 2 && !newCheck) {
          col[newData.content + '_' + col.field + '_array'] = [];
          for (let count = 0; count < col[newData.content + '_' + col.field]; count++) {
            col[newData.content + '_' + col.field + '_array'].push({});
            col[newData.content + '_' + col.field + "_background_" + (count + 1).toString()] = this.setBackground(newData, col.field, count + 1);
            col[newData.content + '_' + col.field + "_left_radius_" + (count + 1).toString()] = this.setLeftBorderRadius(newData, col.field, count + 1)
            col[newData.content + '_' + col.field + "_right_radius_" + (count + 1).toString()] = this.setRightBorderRadius(newData, col.field, count + 1)
            col[newData.content + '_' + col.field + "_tooltips_" + (count + 1).toString()] = this.setTooltipContent(newData, col.field, count + 1)
            col[newData.content + '_' + col.field + "_margin_left_" + (count + 1)] = this.setLeftMargin(fieldData, col.field, (count + 1))
            col[newData.content + '_' + col.field + "_width_" + (count + 1)] = this.setMutipleTimeAxisWidth(newData, col.field, (count + 1));
          }
        }
      }
    }
  }

  /**
   * 滑鼠點擊開始新增
   * @param data 會議室
   * @param field 時間刻度
   */
  startSelectBorrowTime(data: MeetingRoomTimeLineData, field: string) {
    this.selectedDate = [];
    if (!this.checkMutipleDataSelected(data, field) && !this.readOnly) {
      this.selectedRoom = data;
      this.hold = true;
      this.selectedRoom.new = true;
      data[field + '_selected'] = true;
      // this.clearCreatingborrowData();
      this.selectedDate = Object.keys(data).filter(key => (data[key] && key.includes('_selected')));
      this.setTimeLineTableStyle();
    }
  }

  /**
   * 滑鼠移動拖曳要預約的時間段
   * @param data 會議室
   * @param field 時間刻度
   */
  selectingBorrowTime(data: MeetingRoomTimeLineData, field: string) {
    if (this.hold) {
      if (!this.checkMutipleDataSelected(data, field) && !this.readOnly) {
        const index = this.timeAxisOptions.indexOf(this.timeAxisOptions.find(ele => ele.field === field));
        const check = (index > 0 && this.selectedDate.find(val => val.split('_')[0] === this.timeAxisOptions[index - 1].field)) || index === 0
        if (JSON.stringify(data) === JSON.stringify(this.selectedRoom) && check) {
          data[field + '_selected'] = true;
          this.selectedDate = Object.keys(data).filter(key => (data[key] && key.includes('_selected')));
        }
      }
    }
  }

  /** 鬆開滑鼠案件新增完畢，確認無衝突即記錄新增資訊 */
  endSelectingBorrowTime(): void {
    if (this.hold && !this.readOnly) {
      const array = this.createMinmunTimeArray(this.selectedDate[0], this.selectedDate[this.selectedDate.length - 1]);
      if (array !== null && this.hold) {
        const newGroup: RecordTimes = {
          // new: true,
          content: '建立中會議',
          group: array
        };
        if (this.selectedRoom.bookingGroups) {
          this.selectedRoom.bookingGroups.push(newGroup);
          this.selectedRoom.bookingGroups.sort((a, b) => a.group[0].split('_')[0].split('-')[0].localeCompare(b.group[0].split('_')[0].split('-')[0]))
        } else {
          this.selectedRoom.bookingGroups = [newGroup]
        }
        this.selectedDate = [];
        for (const key of Object.keys(this.selectedRoom)) {
          if (key.includes('_selected')) { delete this.selectedRoom[key] }
        }
        this.hold = false;
      }
    }
    this.setTimeLineTableStyle();
  }

  /** 設定已選事件 or 已建立過事件背景顏色 */
  setBackground(data: MeetingRoomTimeLineData, field: string, position = 1): String {
    if (this.hold && this.selectedDate.includes(field + '_selected') && data.content === this.selectedRoom.content) {
      return '#FF6C6C'
    } else if (data.bookingGroups) {
      const array = data.bookingGroups.filter(ele =>
        ele.group.find(val => (Number(this.selectedStep) === 15) ? (val === field + '_selected') : this.checkTimeInRange(val, field)) !== undefined
      );
      return array.length > 0 ? 'darkcyan' : ''
    }
    return '';
  }

  /** 設定td邊框 */
  setBorder(data: MeetingRoomTimeLineData, field: string, direction: 'right' | 'left'): String {
    if (!data.bookingGroups) {
      return '1px solid lightgray'
    } else {
      const timeInFieldData = this.checkMutipleTimeRange(data, field).filter(ele => !this.isObjEmpty(ele));
      const lastIndex = timeInFieldData.length - 1;
      if (timeInFieldData.length > 0) {
        if (direction === 'left') {
          return (this.checkTimeInRange(timeInFieldData[0].group[0], field)) ? '1px solid lightgray' : ''
        } else {
          const groupLastIndex = timeInFieldData[lastIndex].group.length - 1;
          return (this.checkTimeInRange(timeInFieldData[lastIndex].group[groupLastIndex], field)) ? '1px solid lightgray' : ''
        }
      } else {
        return '1px solid lightgray';
      }
    }
  }

  /** 設定右邊界圓滑 */
  setRightBorderRadius(data: MeetingRoomTimeLineData, field: string, position?: number): '' | '15px' {
    if (this.hold && this.selectedRoom.content === data.content && this.selectedDate.includes(field + '_selected')) {
      return '';
    } else if (data && data.bookingGroups && data.bookingGroups.length > 0) {
      const array = this.checkMutipleTimeRange(data, field).filter(ele => !this.isObjEmpty(ele));
      return (array.length >= 1) ? (this.checkTimeInRange(array[position - 1].group[array[position - 1].group.length - 1], field) ? '15px' : '') : '';
    }
    return '';
  }

  /** 設定左邊界圓滑 */
  setLeftBorderRadius(data: MeetingRoomTimeLineData, field: string, position?: number): '' | '15px' {
    if (this.hold && this.selectedRoom.content === data.content && this.selectedDate.includes(field + '_selected')) {
      return '';
    } else if (data && data.bookingGroups && data.bookingGroups.length > 0) {
      const array = this.checkMutipleTimeRange(data, field).filter(ele => !this.isObjEmpty(ele));
      return (array.length >= 1) ? (this.checkTimeInRange(array[position - 1].group[0], field) ? '15px' : '') : '';
    }
    return '';
  }

  /** 設定左邊擠壓空間 */
  setLeftMargin(data: RecordTimes[], field: string, position: number): string {
    const groupLength = data.filter(ele => ele.group).length;
    /** 此時間軸距的起點時間字串 */
    const fieldStart = field.split('_')[0].split('-')[0];
    /** 此時間軸距的起點時間物件 */
    const fieldStartDate = new Date();
    fieldStartDate.setHours(Number(fieldStart.split(':')[0]))
    fieldStartDate.setMinutes(Number(fieldStart.split(':')[1]));
    /** 時間軸內僅有一筆資料，或有重疊資料且該資料為格內順位第一 */
    if (data.length === 1 && position === 1 && data.length == groupLength) {
      /** 找出資料陣列在此時間間距內的第一筆資料 */
      const valStart = data[0].group.filter(ele => this.checkTimeInRange(ele, field))[0].split('_')[0].split('-')[0];
      /** 若兩者相同則不需位移 */
      if (fieldStart === valStart) {
        return ''
      }
      /** 若否進行位移計算 */
      else {
        /** 計算時間差 */
        const valDate = new Date();
        valDate.setHours(Number(valStart.split(':')[0]))
        valDate.setMinutes(Number(valStart.split(':')[1]));
        /** 回傳位移比例 */
        return ((((valDate.getTime() - fieldStartDate.getTime()) / 1000 / 60) / this.selectedStep) * 100).toString() + '%'
      }
    } else if (data.length >= 2 && this.selectedStep == 60 && data.length == groupLength && position >= 2) {
      /** 長度等於4代表全部都填滿，不須位移 */
      if (data.length === 4) {
        return '';
      } else {
        /** 前一筆資料的結尾 */
        const val1End = data[position - 2].group.filter(ele => this.checkTimeInRange(ele, field)).reverse()[0].split('_')[0].split('-')[1];
        /** 第二筆資料的開頭 */
        const val2Start = data[position - 1].group.filter(ele => this.checkTimeInRange(ele, field))[0].split('_')[0].split('-')[0];
        /** 若兩者相同則不需位移 */
        if (val1End === val2Start) {
          return ''
        }
        /** 若否進行位移計算 */
        else {

          const val1EndDate = new Date();
          val1EndDate.setHours(Number(val1End.split(':')[0]))
          val1EndDate.setMinutes(Number(val1End.split(':')[1]));

          const val2StartDate = new Date();
          val2StartDate.setHours(Number(val2Start.split(':')[0]))
          val2StartDate.setMinutes(Number(val2Start.split(':')[1]));
          /** 回傳位移比例 */
          return ((((val2StartDate.getTime() - (data.length == 2 ? fieldStartDate.getTime() : val1EndDate.getTime())) / 1000 / 60) / this.selectedStep) * 100).toString() + '%'
        }
      }

    }
    return '';
  }

  /** 設定衝突方塊的寬 */
  setMutipleTimeAxisWidth(data: MeetingRoomTimeLineData, field: string, position: number): string {
    const array = this.checkMutipleTimeRange(data, field);
    if (!this.isObjEmpty(array[0])) {
      const proportion = array[position - 1].group.filter(ele => this.checkTimeInRange(ele, field)).length * 15;
      return ((proportion / this.selectedStep) * 100).toString() + '%';
    }
    return '';
  }

  /** 建立可選會議時間陣列 */
  setTimeBorrowOption(): void {
    this.clearCreatingborrowData();
    let array = [];
    const nowTime = new Date();
    const startDate = new Date(nowTime.getFullYear(), nowTime.getMonth(), nowTime.getDate(), this.timeRangeSwitch ? 0 : 8);
    const endDate = new Date(nowTime.getFullYear(), nowTime.getMonth(), nowTime.getDate() + Number((this.timeRangeSwitch ? 1 : 0)), this.timeRangeSwitch ? 0 : 20);
    while (startDate.getTime() < endDate.getTime()) {
      const newEndDate = new Date(startDate);
      newEndDate.setMinutes(newEndDate.getMinutes() + Number(this.selectedStep))
      const option = {
        startHeader: this.paddingZero(startDate.getHours()) + ':' + this.paddingZero(startDate.getMinutes()),
        endHeader: this.paddingZero(newEndDate.getHours()) + ':' + this.paddingZero(newEndDate.getMinutes()),
        field: this.paddingZero(startDate.getHours()) + ':' + this.paddingZero(startDate.getMinutes()) + '-' + this.paddingZero(newEndDate.getHours()) + ':' + this.paddingZero(newEndDate.getMinutes())
      }
      startDate.setMinutes(startDate.getMinutes() + Number(this.selectedStep));
      array.push(option);
    }
    // if (this.dateService.convertObjToDb(this.showTime).substring(5, 13) === this.dateService.convertObjToDb(nowTime).substring(5, 13) && this.pageUseMode != 'sign' && this.viewMode === 'create') {
    //   const time = Number(nowTime.getHours()) * 60 + (Math.floor((nowTime.getMinutes() / Number(this.selectedStep))) * Number(this.selectedStep));
    //   array = array.filter(ele =>
    //     (
    //       Number(ele.field.split('-')[0].split(':')[0] * 60) + Number(ele.field.split('-')[0].split(':')[1]) > time &&
    //       Number(ele.field.split('-')[1].split(':')[0] * 60) + Number(ele.field.split('-')[1].split(':')[1]) > time
    //     ) || ele.field.split('-')[1] === '00:00'
    //   );
    // }
    console.log(array);
    this.timeAxisOptions = this.timeRangeSwitch ? array.slice(0, array.length - 1) : array;
  }

  /**
   * 建立以15分鐘為一單位的字串陣列
   * @param start 開頭時間字串 => xx:xx-xx:xx_selected
   * @param end 結束時間字串 => xx:xx-xx:xx_selected
   * @returns 總經過時間字串陣列
   */
  createMinmunTimeArray(start: string, end: string) {
    if (start && end) {
      const nowTime = new Date();
      const array: string[] = [];
      const year = nowTime.getFullYear();
      const month = nowTime.getMonth();
      const date = nowTime.getDate();
      const dayEndCheck = Number(end.split('_')[0].split('-')[1].split(':')[0]) == 0 && Number(end.split('_')[0].split('-')[1].split(':')[1]) == 0;

      const startDate = new Date(year, month, date, Number(start.split('_')[0].split('-')[0].split(':')[0]), Number(start.split('_')[0].split('-')[0].split(':')[1]))
      const endDate = new Date(year, month, date + (dayEndCheck ? 1 : 0), Number(end.split('_')[0].split('-')[1].split(':')[0]), Number(end.split('_')[0].split('-')[1].split(':')[1]))
      while (startDate.getTime() < endDate.getTime()) {
        const nextTime = new Date(startDate);
        nextTime.setMinutes(nextTime.getMinutes() + 15);
        array.push(
          this.paddingZero(startDate.getHours()) + ':' + this.paddingZero(startDate.getMinutes()) + '-' +
          this.paddingZero(nextTime.getHours()) + ':' + this.paddingZero(nextTime.getMinutes()) + '_selected'
        )
        startDate.setMinutes(startDate.getMinutes() + 15);
      }
      return array.sort((a, b) => Number(a.split('_')[0].split('-')[0].replace(':', '')) - Number(b.split('_')[0].split('-')[0].replace(':', '')));
    }
    return null;
  }

  /** 檢查此時段是否包含在較大的時間刻度中 */
  checkTimeInRange(val: string, field: string): boolean {
    const valStart = Number(val.split('_')[0].split('-')[0].replace(':', ''));
    const valEnd = Number(val.split('_')[0].split('-')[1].replace(':', ''));
    const fieldStart = Number(field.split('_')[0].split('-')[0].replace(':', ''));
    const fieldEnd = Number(field.split('_')[0].split('-')[1].replace(':', ''));
    /** 選擇的結尾時間為隔日00:00，僅需檢查起始是否相等 */
    if (fieldEnd === 0 && valEnd === 0) {
      return fieldStart <= valStart;
    }
    else if (valEnd === 0 && fieldEnd !== 0) {
      return fieldStart <= valStart && fieldEnd >= 2400;
    }
    else if (valEnd !== 0 && fieldEnd == 0) {
      return fieldStart <= valStart && 2400 >= valEnd;;
    } else {
      return fieldStart <= valStart && fieldEnd >= valEnd;
    }
  }

  /** 檢查同一會議室內，在目前刻度下有重疊的資料 */
  checkMutipleTimeRange(data: MeetingRoomTimeLineData, field: string): RecordTimes[] {
    const array = (data.bookingGroups && data.bookingGroups.length > 0)
      ? data.bookingGroups.filter(ele => ele.group.find(val => this.checkTimeInRange(val, field)) !== undefined)
      : [{} as RecordTimes];
    if (array.length > 0) {
      array.sort((a, b) => a.group[0].split('_')[0].split('-')[0].localeCompare(b.group[0].split('_')[0].split('-')[0]))
    }
    return array;
  }

  /**
  * 檢查要新增的資料欄位是否已有新增紀錄
  * @param data 會議室
  * @param field 時間刻度
  * @returns 是否有新增紀錄
  */
  checkMutipleDataSelected(data: MeetingRoomTimeLineData, field: string) {
    if (data && data.bookingGroups && data.bookingGroups.length > 0) {
      return data.bookingGroups.find(ele =>
        !ele.new && ele.group && ele.group.find(val =>
          this.checkTimeInRange(val, field)) !== undefined
      ) !== undefined ? true : false;
    } else {
      return false;
    }
  }

  /** 清空已新建會議群組資料 */
  clearCreatingborrowData(): void {
    this.meetinRoomArray.forEach(ele => {
      delete ele.new;
      if (ele.bookingGroups && ele.bookingGroups.length > 0) {
        ele.bookingGroups = ele.bookingGroups.filter(ele => !ele.new);
      }
    });
  }

  /** 建立房間標題資訊 */
  setTimelineGroups(): void {
    this.meetinRoomArray = this.meetingRoom.map(ele => {
      const obj: MeetingRoomTimeLineData = {
        id: ele.pk_id,
        content: ele.meeting_room_id + '-' + ele.location,
        bookingGroups: []
      }
      const timeGroupArray = this.setTimeLineData(ele.pk_id)
      if (timeGroupArray) {
        obj.bookingGroups = timeGroupArray
      } else {
        delete obj.bookingGroups
      }
      return obj
    })
  }

  /**
   * 設定預約紀錄資料
   * @param pk_id 會議室PK_id
   * @param room_type 會議室類型
   */
  setTimeLineData(pk_id: string): RecordTimes[] {
    const timeDataArray = this.meetingRoomTimeData.filter(ele => ele.room_pk_id === pk_id);
    if (timeDataArray.length > 0) {
      const array = timeDataArray.map(ele => {
        const start = ele.used_start_time
        const end = ele.used_end_time
        const obj: RecordTimes = {
          group: this.createMinmunTimeArray(this.returnTimelineFormatData(start), this.returnTimelineFormatData(end)),
          content: '會議主題' + ':\n' + ele.title
        }
        return obj;
      })
      return array;
    }
    return null;
  }

  /**
   * 回傳時間表間距格式
   * @param date 日期時間
   * @returns 格式化字串
   */
  returnTimelineFormatData(date: Date): string {
    return this.paddingZero(date.getHours()) + ':' + this.paddingZero(date.getMinutes()) + '-' +
      this.paddingZero(date.getHours()) + ':' + this.paddingZero(date.getMinutes()) + '_selected';
  }

  /** 回傳最後預約時間起迄 */
  returnBorrowedTime(data: MeetingRoomTimeLineData, type: 'start' | 'end'): string {
    const group = data.bookingGroups.find(ele => ele.new).group;
    return type === 'start'
      ? group[0].split('_')[0].split('-')[0]
      : group[group.length - 1].split('_')[0].split('-')[1]
  }

  /**
   * 回傳所屬內容作為Tooltip顯示
   * @param data 會議室
   * @param field 所在時刻
   * @param position 重疊格中第幾個位置
   * @returns 回傳預約人資訊
   */
  setTooltipContent(data: MeetingRoomTimeLineData, field: string, position: number): string {
    const group = this.returnTimeAxisGroups(data, field, position);
    if (group) {
      const timeRange = group.group[0].split('_')[0].split('-')[0] + '~' + group.group[group.group.length - 1].split('_')[0].split('-')[1] + '\n'
      return group.content + '\n' + '會議是借用時段' + ' : ' + timeRange;
    }
    return '';
  }

  /**
   * 回傳所在時區群組
   * @param data 會議室
   * @param field 時間刻度
   * @param position 重疊區域所在位置
   * @returns 回傳此時刻所在時區
   */
  returnTimeAxisGroups(data: MeetingRoomTimeLineData, field: string, position: number): RecordTimes | null {
    if (data && data.bookingGroups && data.bookingGroups.length > 0) {
      if (!position) {
        const group = data.bookingGroups.find(ele => ele.group.find(val => this.checkTimeInRange(val, field)))
        return group ? group : null;
      } else {
        return this.checkMutipleTimeRange(data, field).slice(-1)[0]
      }
    }
    return null;
  }

  /** 補零 */
  paddingZero(str: number): string {
    let n = String(str);
    while (n.length < 2) { n = '0' + n; }
    return n;
  }

  /** 是否為空物件 */
  isObjEmpty(obj): boolean {
    for (var prop in obj) {
      if (obj.hasOwnProperty(prop)) return false;
    }
    return true;
  }
}

/** 時間表資料架構 */
export class MeetingRoomTimeLineData {
  /** 會議室PK_ID */
  id?: string;
  /** 會議室名稱 */
  content?: string;
  /** 此會議室預約紀錄 */
  bookingGroups?: RecordTimes[];
  /** 是否內部有新建紀錄 */
  new?: boolean;
}

/** 預約紀錄 */
export class RecordTimes {
  /** 是否為新建紀錄 */
  new?: boolean;
  /** 借用記錄標題 */
  content?: string;
  /** 借用紀錄ID */
  id?: string;
  /** 借用時段 */
  group?: string[];
}

/** 會議室 */
export class MeetingRoom {
  /** 識別碼 */
  pk_id = UUID.UUID();
  /** 會議室ID */
  meeting_room_id?: string;
  /** 會議室名稱 */
  location?: string;
}

/** 會議室借用紀錄 */
export class MeetingRoomTime {
  /** 識別碼 */
  pk_id = UUID.UUID();
  /** 會議標題 */
  title?: string;
  /** 會議室pk_id */
  room_pk_id?: string;
  /** 借用日期 */
  used_dt?: Date;
  /** 開始時間(一般) */
  used_start_time?: Date;
  /** 結束時間 */
  used_end_time?: Date;
}
