# Architecture v0.5

Presentation(React) -> Application Services -> HR/Payroll Domain & Rules -> Repository Interfaces -> IndexedDB Adapter.

Fact HR data, AI output, Simulation data는 분리합니다. Employee Master는 downstream module 원천정보의 Single Source of Truth입니다. Payroll은 월별 Snapshot/Run으로 마감 이력을 보존합니다. Daily Worker는 정규 Employment UI와 원장을 분리하지만 Person 개념은 재사용합니다.
