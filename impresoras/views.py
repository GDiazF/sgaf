from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Printer
from .serializers import PrinterSerializer
from .services import poll_and_store_printer, PollingError

class PrinterViewSet(viewsets.ModelViewSet):
    queryset = Printer.objects.all().order_by("name")
    serializer_class = PrinterSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=["post"])
    def refresh(self, request, pk=None):
        printer = self.get_object()
        try:
            poll_and_store_printer(printer)
            serializer = self.get_serializer(printer)
            return Response({"success": True, "printer": serializer.data})
        except PollingError as exc:
            return Response({"success": False, "error": str(exc)}, status=status.HTTP_200_OK)
        except Exception as exc:
            return Response({"success": False, "error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=["post"])
    def refresh_all(self, request):
        results = []
        any_error = False
        printers = self.get_queryset().filter(enabled=True)
        for printer in printers:
            try:
                poll_and_store_printer(printer)
                results.append({"id": printer.id, "ok": True})
            except PollingError as exc:
                any_error = True
                results.append({"id": printer.id, "ok": False, "error": str(exc)})
            except Exception as exc:
                any_error = True
                results.append({"id": printer.id, "ok": False, "error": str(exc)})
        
        return Response({"success": not any_error, "results": results})

    @action(detail=False, methods=["post"])
    def scan(self, request):
        start_ip = request.data.get("start_ip")
        end_ip = request.data.get("end_ip")
        community = request.data.get("community", "public")
        
        if not start_ip or not end_ip:
            return Response({"error": "Missing start_ip or end_ip"}, status=status.HTTP_400_BAD_REQUEST)
        
        from .services import scan_network_range
        found = scan_network_range(start_ip, end_ip, community)
        
        return Response({"success": True, "found": found})
