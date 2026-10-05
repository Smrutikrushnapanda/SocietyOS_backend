"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdatePollDto = exports.VotePollDto = exports.CreatePollOptionDto = exports.CreatePollDto = exports.PollStatus = void 0;
var PollStatus;
(function (PollStatus) {
    PollStatus["DRAFT"] = "DRAFT";
    PollStatus["PUBLISHED"] = "PUBLISHED";
    PollStatus["CLOSED"] = "CLOSED";
})(PollStatus || (exports.PollStatus = PollStatus = {}));
class CreatePollDto {
    title;
    description;
    starts_at;
    ends_at;
    created_by;
    id;
    options;
}
exports.CreatePollDto = CreatePollDto;
class CreatePollOptionDto {
    option_text;
    display_order;
}
exports.CreatePollOptionDto = CreatePollOptionDto;
class VotePollDto {
    poll_id;
    option_id;
    id;
}
exports.VotePollDto = VotePollDto;
class UpdatePollDto {
    status;
    id;
}
exports.UpdatePollDto = UpdatePollDto;
//# sourceMappingURL=dto.js.map