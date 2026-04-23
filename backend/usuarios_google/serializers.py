from rest_framework import serializers
from .models import GoogleUser, GoogleUploadLog, GoogleOrgUnit

class GoogleOrgUnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = GoogleOrgUnit
        fields = '__all__'

class GoogleUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = GoogleUser
        fields = '__all__'

class GoogleUploadLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = GoogleUploadLog
        fields = '__all__'
