"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateComplaintDto = exports.CreateComplaintDto = exports.ComplaintCategory = void 0;
var ComplaintCategory;
(function (ComplaintCategory) {
    ComplaintCategory["MAINTENANCE"] = "MAINTENANCE";
    ComplaintCategory["FACILITY"] = "FACILITY";
    ComplaintCategory["AMENITY"] = "AMENITY";
    ComplaintCategory["SAFETY"] = "SAFETY";
    ComplaintCategory["OTHER"] = "OTHER";
})(ComplaintCategory || (exports.ComplaintCategory = ComplaintCategory = {}));
class CreateComplaintDto {
    resident_id;
    flat_id;
    category;
    subject;
    description;
    assigned_to;
    priority;
    id;
}
exports.CreateComplaintDto = CreateComplaintDto;
class UpdateComplaintDto {
    status;
    priority;
    assigned_to;
}
exports.UpdateComplaintDto = UpdateComplaintDto;
//# sourceMappingURL=dto.js.map