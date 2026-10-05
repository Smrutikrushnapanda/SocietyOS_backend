"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateNoticeDto = exports.CreateNoticeDto = exports.NoticeStatus = void 0;
var NoticeStatus;
(function (NoticeStatus) {
    NoticeStatus["DRAFT"] = "DRAFT";
    NoticeStatus["PUBLISHED"] = "PUBLISHED";
    NoticeStatus["ARCHIVED"] = "ARCHIVED";
})(NoticeStatus || (exports.NoticeStatus = NoticeStatus = {}));
class CreateNoticeDto {
    title;
    content;
    status;
    expires_at;
    created_by;
    id;
}
exports.CreateNoticeDto = CreateNoticeDto;
class UpdateNoticeDto {
    title;
    content;
    status;
    expires_at;
    id;
}
exports.UpdateNoticeDto = UpdateNoticeDto;
//# sourceMappingURL=dto.js.map