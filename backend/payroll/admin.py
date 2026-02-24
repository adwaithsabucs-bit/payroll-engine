from django.contrib import admin
from .models import SupervisorPayroll, ContractorPayroll, LabourerPayroll

admin.site.register(SupervisorPayroll)
admin.site.register(ContractorPayroll)
admin.site.register(LabourerPayroll)